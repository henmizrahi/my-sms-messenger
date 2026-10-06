require "rails_helper"

RSpec.describe "Messages API", type: :request do
  let(:valid_params) { { to: "+1 (555) 123-4567", body: "Hello there" } }

  describe "POST /api/messages" do
    it "saves the message, sends it and returns it as sent" do
      post "/api/messages", params: valid_params, as: :json

      expect(response).to have_http_status(:created)
      json = response.parsed_body
      expect(json.keys).to contain_exactly("id", "to", "body", "status", "errorMessage", "createdAt")
      expect(json).to include(
        "id" => Message.last.id.to_s,
        "to" => "+15551234567",
        "body" => "Hello there",
        "status" => "sent",
        "errorMessage" => nil
      )
      expect(json["createdAt"]).to match(/\A\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\z/)
      expect(Message.last.twilio_sid).to start_with("FAKE")
    end

    it "returns 201 with status failed and the reason when sending fails" do
      post "/api/messages", params: { to: FakeSmsSender::FAILING_NUMBER, body: "Hello there" }, as: :json

      expect(response).to have_http_status(:created)
      expect(response.parsed_body).to include("status" => "failed", "errorMessage" => "Invalid 'To' phone number")
      expect(Message.last).to have_attributes(status: "failed", twilio_sid: nil)
    end

    it "does not try to send an invalid message" do
      allow(SmsSender).to receive(:build)

      post "/api/messages", params: { to: "12345", body: "Hello there" }, as: :json

      expect(response).to have_http_status(:unprocessable_content)
      expect(SmsSender).not_to have_received(:build)
    end

    it "ignores session_id, status and twilio_sid sent by the client" do
      post "/api/messages",
        params: valid_params.merge(session_id: "someone-else", status: "failed", twilio_sid: "SM123"),
        as: :json

      expect(response).to have_http_status(:created)
      message = Message.last
      expect(message.session_id).to be_present
      expect(message.session_id).not_to eq("someone-else")
      expect(message.status).to eq("sent")
      expect(message.twilio_sid).to start_with("FAKE")
    end

    it "rejects a missing body with 422 and saves nothing" do
      post "/api/messages", params: { to: "+15551234567" }, as: :json

      expect(response).to have_http_status(:unprocessable_content)
      expect(response.parsed_body).to eq("errors" => { "body" => [ "can't be blank" ] })
      expect(Message.count).to eq(0)
    end

    it "rejects an invalid phone number with 422 and saves nothing" do
      post "/api/messages", params: { to: "12345", body: "Hello there" }, as: :json

      expect(response).to have_http_status(:unprocessable_content)
      expect(response.parsed_body).to eq("errors" => { "to" => [ "is invalid" ] })
      expect(Message.count).to eq(0)
    end

    it "returns 400 for malformed JSON" do
      post "/api/messages", params: "{not json", headers: { "CONTENT_TYPE" => "application/json" }

      expect(response).to have_http_status(:bad_request)
      expect(response.parsed_body).to eq("error" => "Request body is not valid JSON")
      expect(Message.count).to eq(0)
    end

    it "sets the session cookie with httponly and samesite=lax" do
      post "/api/messages", params: valid_params, as: :json

      set_cookie = Array(response.headers["Set-Cookie"]).join("\n")
      expect(set_cookie).to match(/^_mysms_session=/)
      expect(set_cookie).to match(/httponly/i)
      expect(set_cookie).to match(/samesite=lax/i)
    end
  end

  describe "GET /api/messages" do
    it "returns an empty array for a new session" do
      get "/api/messages"

      expect(response).to have_http_status(:ok)
      expect(response.parsed_body).to eq([])
    end

    it "returns only the current session's messages, newest first" do
      post "/api/messages", params: valid_params.merge(body: "middle"), as: :json
      session_id = Message.last.session_id
      # Explicit timestamps so the ordering doesn't depend on how fast the specs run.
      create(:message, session_id: session_id, body: "oldest", created_at: 1.hour.ago)
      create(:message, session_id: session_id, body: "newest", created_at: 1.hour.from_now)
      create(:message, session_id: "another-session", body: "not mine")

      get "/api/messages"

      expect(response).to have_http_status(:ok)
      expect(response.parsed_body.pluck("body")).to eq(%w[newest middle oldest])
    end

    it "does not show one session's messages to another" do
      first_browser = open_session
      second_browser = open_session
      first_browser.post "/api/messages", params: valid_params.merge(body: "from first"), as: :json
      second_browser.post "/api/messages", params: valid_params.merge(body: "from second"), as: :json

      first_browser.get "/api/messages"
      second_browser.get "/api/messages"

      expect(first_browser.response.parsed_body.pluck("body")).to eq([ "from first" ])
      expect(second_browser.response.parsed_body.pluck("body")).to eq([ "from second" ])
    end
  end
end
