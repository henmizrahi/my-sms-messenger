# My SMS Messenger

A small web app for sending SMS messages and viewing the messages you have sent.

## What it does

- Send an SMS to a phone number in international (E.164) format, up to 250 characters.
- See the history of messages sent from this browser, newest first, with the send status of each.
- Each browser gets its own anonymous session; there are no accounts, and one browser cannot see another's messages.

## Tech stack

| Layer | Technology |
|---|---|
| Backend | Ruby 3.4, Rails 8.1 (API mode), Mongoid 9 |
| Database | MongoDB (Atlas) |
| SMS | Twilio (`twilio-ruby`), behind an adapter with a fake implementation |
| Frontend | Angular 22 (standalone components, signals, zoneless), SCSS |
| Tests | RSpec and FactoryBot (backend), Vitest (frontend) |

The repository is a monorepo: the Rails API is in `backend/` and the Angular app is in `frontend/`.

## Running locally

### Prerequisites

- Ruby 3.4.11 (pinned in `.ruby-version`) and Bundler
- Node.js 22.22.3+, 24.15+ or 26+, and npm
- A MongoDB Atlas cluster (the free tier is enough) and its connection string, with your IP address on the cluster's network access list

### 1. Backend

```bash
cd backend
bundle install
cp .env.example .env
```

Edit `backend/.env` and set `MONGODB_URI` to your Atlas connection string. Only the cluster address and credentials are read from it; the database name is set per environment in `config/mongoid.yml` (`mysms_development`, `mysms_test`). Leave `SMS_PROVIDER=fake` to run without Twilio.

If the password contains characters such as `@` or `/`, percent-encode them in the connection string.

Create the database index, then start the server on port 3000:

```bash
bin/rails db:mongoid:create_indexes
bin/rails server
```

### 2. Frontend

In a second terminal:

```bash
cd frontend
npm install
npm start
```

Open http://localhost:4200. The Angular dev server proxies `/api` to the Rails server on port 3000 (see `frontend/proxy.conf.json`), so both must be running.

### Trying it without Twilio

With `SMS_PROVIDER=fake`, no SMS is sent. Any valid number is recorded as sent, except `+15005550001`, which always fails, so you can see how a failed message is shown.

## Running the tests

Backend (the specs use the `mysms_test` database on the same Atlas cluster, so `MONGODB_URI` must be set):

```bash
cd backend
bundle exec rspec
```

Frontend:

```bash
cd frontend
npm test -- --watch=false
```

The backend specs always use the fake SMS sender, whatever `SMS_PROVIDER` is set to, and never contact Twilio.

## Architecture

### Request flow

Sending a message:

1. `MessageForm` validates the input and emits `{ to, body }`.
2. `App` passes it to `MessagesService`, which sends `POST /api/messages`.
3. The Angular dev server proxies the request to Rails.
4. `Api::MessagesController#create` builds a `Message` for the current session and saves it with status `queued`. Invalid input returns `422` with the validation errors.
5. `MessageDelivery` sends the message through the configured SMS sender and updates it to `sent` (with the provider's ID) or `failed` (with the reason).
6. The controller returns `201` with the message as JSON. The service then reloads the history from the API, and the form clears.

Loading the history is `GET /api/messages`, which returns the current session's messages, newest first. A compound index on `session_id` and `created_at` serves that query.

### Session cookie

Rails API mode has no sessions by default, so the cookie and session middleware are added back. On a browser's first request the server stores a random UUID in an encrypted session cookie (`_mysms_session`, `HttpOnly`, `SameSite=Lax`, and `Secure` in production). Every message is saved with that ID, and every query is scoped to it. The client never sends or sees the ID.

### Proxy instead of CORS

The browser talks only to the Angular dev server, which forwards `/api` to Rails. The frontend and API are therefore same-origin: no CORS configuration is needed, and the session cookie is a first-party cookie that works with `SameSite=Lax`.

### SMS adapter

`SmsSender` chooses the sender class from the `SMS_PROVIDER` environment variable:

- `fake` (default): `FakeSmsSender` sends nothing and returns a fake ID.
- `twilio`: `TwilioSmsSender` calls the Twilio Messages API.

Both expose `deliver(to:, body:)` and raise the same `SmsSender::Error` on failure, so the rest of the app does not depend on the Twilio gem. If `SMS_PROVIDER=twilio` and a Twilio variable is missing, the app refuses to boot and names the missing variable.

## Key decisions

- **E.164 phone numbers.** It is the format Twilio requires and it is unambiguous across countries. The API strips spaces, dashes and parentheses before validating, and the form applies the same rule, so `+1 (555) 123-4567` is accepted and stored as `+15551234567`.
- **Save first, then send, with `queued` / `sent` / `failed`.** The message is stored before the provider is called, so a record exists whatever happens during sending, and the history shows the real outcome.
- **`201` even when delivery fails.** The request to create the message succeeded; delivery is a property of the message (`status` and `errorMessage`), not of the HTTP request. `422` is reserved for input the API rejects, and nothing is saved in that case.
- **camelCase JSON.** A single serializer defines the public shape (`id`, `to`, `body`, `status`, `errorMessage`, `createdAt`) in the convention the TypeScript client uses, and keeps internal fields (`session_id`, `twilio_sid`) out of responses.
- **State as signals in a service.** `MessagesService` holds `messages`, `loading` and `error` as read-only signals and is the only place that makes HTTP calls. This is enough for one page of state without a state-management library.
- **Presentational components.** `MessageForm`, `MessageHistory` and `MessageCard` only take inputs and emit outputs. `App` is the single component that talks to the service, which keeps the others easy to test in isolation.
- **Sending is synchronous.** The SMS is sent inside the request, which is simple and adequate here. With real traffic it would move to a background job, which is what the `queued` status allows for.

## Twilio trial limitations

Twilio's current trial accounts (checked October 2026) cannot use the Virtual Phone, which Twilio documents as available only in the legacy Console trial experience, and can only send predefined template bodies to verified US numbers (see the [trial SMS documentation](https://www.twilio.com/docs/usage/trials/try-out-sms) and the [Virtual Phone guide](https://www.twilio.com/docs/messaging/guides/guide-to-using-the-twilio-virtual-phone)). A free-text message to an arbitrary number therefore cannot be delivered from a trial account.

For that reason `SMS_PROVIDER=fake` is the default. The real `TwilioSmsSender` was verified against the live Twilio API with a trial account: Twilio rejected the request with

> No Twilio trial phone number is assigned for messaging to this destination number. Please add the 'to' number as a verified recipient.

and the app stored the message as `failed` with that reason and returned it to the UI, which is the designed behaviour for a provider error.

Switching to a full Twilio account needs no code change, only these lines in `backend/.env`:

```
SMS_PROVIDER=twilio
TWILIO_ACCOUNT_SID=<your Account SID>
TWILIO_AUTH_TOKEN=<your Auth Token>
TWILIO_FROM_NUMBER=<your Twilio number in E.164 format>
```
