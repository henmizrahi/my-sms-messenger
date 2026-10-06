# The public JSON shape of a Message. Internal fields (session_id, twilio_sid)
# are deliberately left out.
class MessageSerializer
  def self.render(message)
    {
      id: message.id.to_s,
      to: message.to,
      body: message.body,
      status: message.status,
      errorMessage: message.error_message,
      createdAt: message.created_at.utc.iso8601(3)
    }
  end

  def self.render_many(messages)
    messages.map { |message| render(message) }
  end
end
