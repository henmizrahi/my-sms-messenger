FactoryBot.define do
  factory :message do
    to { "+15551234567" }
    body { "Hello from the specs" }
    session_id { "session-abc123" }
  end
end
