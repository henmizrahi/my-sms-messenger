require "rails_helper"

RSpec.describe TwilioSmsSender do
  subject(:sender) { described_class.new(client: client, from: "+15005550006") }

  let(:client) { instance_double(Twilio::REST::Client, messages: messages) }
  let(:messages) { double("Twilio messages resource") }

  describe "#deliver" do
    it "creates the message through Twilio and returns its SID" do
      allow(messages).to receive(:create).and_return(double(sid: "SM123abc"))

      sid = sender.deliver(to: "+15551234567", body: "Hello")

      expect(sid).to eq("SM123abc")
      expect(messages).to have_received(:create).with(from: "+15005550006", to: "+15551234567", body: "Hello")
    end

    it "wraps a Twilio API error, keeping Twilio's reason" do
      response = Twilio::Response.new(400, { code: 21211, message: "Invalid 'To' Phone Number" }.to_json)
      allow(messages).to receive(:create).and_raise(Twilio::REST::RestError.new("Unable to create record", response))

      expect { sender.deliver(to: "+15551234567", body: "Hello") }
        .to raise_error(SmsSender::Error, "Invalid 'To' Phone Number")
    end

    it "wraps other Twilio errors" do
      allow(messages).to receive(:create).and_raise(Twilio::REST::TwilioError, "Something went wrong")

      expect { sender.deliver(to: "+15551234567", body: "Hello") }
        .to raise_error(SmsSender::Error, "Something went wrong")
    end

    it "wraps network failures" do
      allow(messages).to receive(:create).and_raise(Faraday::ConnectionFailed, "execution expired")

      expect { sender.deliver(to: "+15551234567", body: "Hello") }
        .to raise_error(SmsSender::Error, "execution expired")
    end
  end

  describe ".missing_configuration" do
    it "lists the Twilio variables that are not set" do
      stub_const("ENV", ENV.to_h.merge("TWILIO_ACCOUNT_SID" => "ACtest", "TWILIO_AUTH_TOKEN" => "", "TWILIO_FROM_NUMBER" => nil))

      expect(described_class.missing_configuration).to eq(%w[TWILIO_AUTH_TOKEN TWILIO_FROM_NUMBER])
    end

    it "is empty when all three are set" do
      stub_const("ENV", ENV.to_h.merge(
        "TWILIO_ACCOUNT_SID" => "ACtest", "TWILIO_AUTH_TOKEN" => "token", "TWILIO_FROM_NUMBER" => "+15005550006"
      ))

      expect(described_class.missing_configuration).to eq([])
    end
  end
end
