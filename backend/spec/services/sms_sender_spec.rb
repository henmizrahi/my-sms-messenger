require "rails_helper"

RSpec.describe SmsSender do
  def with_env(overrides)
    stub_const("ENV", ENV.to_h.except("SMS_PROVIDER", *TwilioSmsSender::REQUIRED_ENV).merge(overrides))
  end

  describe ".build" do
    it "defaults to the fake sender" do
      with_env({})

      expect(described_class.build).to be_a(FakeSmsSender)
    end

    it "builds the Twilio sender when SMS_PROVIDER is twilio" do
      with_env("SMS_PROVIDER" => "twilio", "TWILIO_ACCOUNT_SID" => "ACtest",
        "TWILIO_AUTH_TOKEN" => "token", "TWILIO_FROM_NUMBER" => "+15005550006")

      expect(described_class.build).to be_a(TwilioSmsSender)
    end

    it "rejects an unknown provider" do
      with_env("SMS_PROVIDER" => "carrier-pigeon")

      expect { described_class.build }.to raise_error(SmsSender::ConfigurationError, /Unknown SMS_PROVIDER "carrier-pigeon"/)
    end
  end

  describe ".verify_configuration!" do
    it "passes for the fake sender" do
      with_env("SMS_PROVIDER" => "fake")

      expect { described_class.verify_configuration! }.not_to raise_error
    end

    it "names the missing Twilio variables" do
      with_env("SMS_PROVIDER" => "twilio", "TWILIO_ACCOUNT_SID" => "ACtest")

      expect { described_class.verify_configuration! }.to raise_error(
        SmsSender::ConfigurationError,
        "SMS_PROVIDER=twilio requires TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER to be set"
      )
    end

    it "passes for Twilio when everything is set" do
      with_env("SMS_PROVIDER" => "twilio", "TWILIO_ACCOUNT_SID" => "ACtest",
        "TWILIO_AUTH_TOKEN" => "token", "TWILIO_FROM_NUMBER" => "+15005550006")

      expect { described_class.verify_configuration! }.not_to raise_error
    end
  end
end
