# Sends nothing. Used in development and test so the app runs without Twilio
# credentials and specs never touch the network.
class FakeSmsSender
  # Mirrors Twilio's magic test number that always fails as an invalid recipient.
  FAILING_NUMBER = "+15005550001"

  def self.missing_configuration
    []
  end

  def deliver(to:, body:)
    raise SmsSender::Error, "Invalid 'To' phone number" if to == FAILING_NUMBER

    "FAKE#{SecureRandom.hex(16)}"
  end
end
