# My SMS Messenger

A small web app for sending SMS messages and viewing the messages sent from your browser.

**Live demo:** https://my-sms-messenger-syx3.onrender.com

The demo runs on a free instance that sleeps when idle, so the first load takes about a minute.

## What it does

- Sends an SMS to a number in international (E.164) format, up to 250 characters.
- Lists the messages sent from this browser, newest first, with the status of each.
- Gives each browser an anonymous session. There are no accounts, and one browser cannot see another's messages.

## Tech stack

| Layer | Technology |
|---|---|
| Backend (`backend/`) | Ruby 3.4, Rails 8.1 in API mode, Mongoid 9 |
| Database | MongoDB Atlas |
| SMS | Twilio, behind an adapter that also has a fake implementation |
| Frontend (`frontend/`) | Angular 22 with standalone components and signals, SCSS |
| Tests | RSpec and FactoryBot, Vitest |

## Running locally

### Prerequisites

- Ruby 3.4.11 (pinned in `.ruby-version`) and Bundler
- Node.js 22.22.3+, 24.15+ or 26+, and npm
- A MongoDB Atlas cluster (the free tier is enough), with your IP address on its network access list

### 1. Backend

```bash
cd backend
bundle install
cp .env.example .env
```

Set `MONGODB_URI` in `backend/.env` to your Atlas connection string. If the password contains characters such as `@` or `/`, percent-encode them. The database name comes from `config/mongoid.yml`, not from the connection string.

Create the database index and start the server on port 3000:

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

Open http://localhost:4200. Both servers must be running.

### Sending without Twilio

`SMS_PROVIDER=fake` is the default and sends nothing. Every valid number is recorded as sent, except `+15005550001`, which always fails so that a failed message can be seen.

## Running the tests

The backend specs use the `mysms_test` database on the same Atlas cluster, so `MONGODB_URI` must be set. They always use the fake sender and never contact Twilio.

```bash
cd backend
bundle exec rspec
```

```bash
cd frontend
npm test -- --watch=false
```

## Architecture

```
Angular form
  → POST /api/messages
  → Api::MessagesController
  → Message saved as "queued"
  → MessageDelivery
  → SmsSender (FakeSmsSender or TwilioSmsSender)
  → Message updated to "sent" or "failed"
  → 201 with the message as JSON
```

In development the Angular dev server proxies `/api` to Rails. In production Rails serves the built Angular app and the API from one origin. Either way the browser sees a single origin, so there is no CORS setup and the session cookie is first-party.

Key decisions:

- **The session comes from the cookie.** The server stores a random ID in an encrypted, `HttpOnly`, `SameSite=Lax` cookie and scopes every message and query to it. The client never sends or sees the ID.
- **Save first, then send.** A record exists whatever happens during sending, and the delivery outcome is a property of the message (`status`, `errorMessage`). The API returns `201` when the message is saved, and `422` is reserved for invalid input.
- **SMS goes through an adapter.** `SMS_PROVIDER` selects the sender. Both senders raise the same error class, so the rest of the app does not depend on the Twilio gem.
- **Sending is rate limited** to 10 messages a minute per session, with a looser limit per address behind it. Over the limit the API answers `429`.
- **Sending is synchronous.** It happens inside the request, which is simple and enough at this scale. With real traffic it would move to a background job, which the `queued` status allows for.

On the frontend, `MessagesService` holds the state as signals and is the only code that makes HTTP calls. `App` connects it to three presentational components.

## Twilio trial limitations

The trial account could not be used as the exercise suggests: Twilio's trial messaging page only allows sending a predefined template message to a verified phone number, and the trial API has the same limits (see the [trial SMS documentation](https://www.twilio.com/docs/usage/trials/try-out-sms)). A free-text message from the app therefore cannot be delivered.

The fake provider is therefore the default, here and in the live demo. The real `TwilioSmsSender` was verified against the live Twilio API: Twilio rejected the request, and the app stored the message as `failed` with Twilio's reason, as designed for a provider error.

A full Twilio account needs no code change, only `SMS_PROVIDER=twilio` and the three `TWILIO_` variables listed in `backend/.env.example`.

## Deployment

The app runs on [Render](https://render.com) as a single web service defined in `render.yaml`. The build script (`bin/render-build.sh`) builds the Angular app into `backend/public`, and Rails serves it alongside the API. `MONGODB_URI` is set in the Render dashboard.
