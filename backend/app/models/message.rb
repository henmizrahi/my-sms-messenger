class Message
  include Mongoid::Document
  include Mongoid::Timestamps

  STATUSES = %w[queued sent failed].freeze
  E164_FORMAT = /\A\+[1-9]\d{7,14}\z/
  MAX_BODY_LENGTH = 250

  field :to, type: String
  field :body, type: String
  field :session_id, type: String
  field :status, type: String, default: "queued"
  field :twilio_sid, type: String
  field :error_message, type: String

  index({ session_id: 1, created_at: -1 })

  before_validation :normalize_to

  validates :to, presence: true, format: { with: E164_FORMAT, allow_blank: true }
  validates :body, presence: true, length: { maximum: MAX_BODY_LENGTH }
  validates :session_id, presence: true
  validates :status, inclusion: { in: STATUSES }

  private
    def normalize_to
      self.to = to.gsub(/[\s\-()]/, "") if to.is_a?(String)
    end
end
