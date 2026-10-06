# Entry point for sending SMS. Callers depend on this module and on
# SmsSender::Error only, never on a specific provider.
module SmsSender
  class Error < StandardError; end
  class ConfigurationError < StandardError; end

  PROVIDERS = {
    "fake" => "FakeSmsSender",
    "twilio" => "TwilioSmsSender"
  }.freeze
  DEFAULT_PROVIDER = "fake"

  def self.provider
    ENV.fetch("SMS_PROVIDER", DEFAULT_PROVIDER)
  end

  def self.build
    sender_class.new
  end

  def self.verify_configuration!
    missing = sender_class.missing_configuration
    return if missing.empty?

    raise ConfigurationError, "SMS_PROVIDER=#{provider} requires #{missing.join(', ')} to be set"
  end

  def self.sender_class
    PROVIDERS.fetch(provider) do
      raise ConfigurationError, "Unknown SMS_PROVIDER #{provider.inspect}; expected one of: #{PROVIDERS.keys.join(', ')}"
    end.constantize
  end
  private_class_method :sender_class
end
