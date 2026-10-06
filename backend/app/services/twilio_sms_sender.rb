# twilio-ruby loads Faraday lazily; require it so the rescue below can name it.
require "faraday"

class TwilioSmsSender
  REQUIRED_ENV = %w[TWILIO_ACCOUNT_SID TWILIO_AUTH_TOKEN TWILIO_FROM_NUMBER].freeze

  def self.missing_configuration
    REQUIRED_ENV.select { |name| ENV[name].blank? }
  end

  def initialize(client: nil, from: ENV["TWILIO_FROM_NUMBER"])
    @client = client || Twilio::REST::Client.new(ENV.fetch("TWILIO_ACCOUNT_SID"), ENV.fetch("TWILIO_AUTH_TOKEN"))
    @from = from
  end

  def deliver(to:, body:)
    @client.messages.create(from: @from, to: to, body: body).sid
  rescue Twilio::REST::RestError => e
    # error_message is Twilio's one-line reason; message adds HTTP and doc-link noise.
    raise SmsSender::Error, e.error_message.presence || e.message.strip
  rescue Twilio::REST::TwilioError, Faraday::Error => e
    raise SmsSender::Error, e.message
  end
end
