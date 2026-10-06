# Sends a saved message and records the outcome on it.
class MessageDelivery
  def initialize(sender: SmsSender.build)
    @sender = sender
  end

  def call(message)
    sid = @sender.deliver(to: message.to, body: message.body)
    message.update!(status: "sent", twilio_sid: sid)
    message
  rescue SmsSender::Error => e
    message.update!(status: "failed", error_message: e.message)
    message
  end
end
