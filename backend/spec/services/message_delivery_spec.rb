require "rails_helper"

RSpec.describe MessageDelivery do
  let(:message) { create(:message) }
  let(:sender) { instance_double(FakeSmsSender) }

  it "marks the message as sent and stores the provider SID" do
    allow(sender).to receive(:deliver).and_return("SM123abc")

    result = described_class.new(sender: sender).call(message)

    expect(sender).to have_received(:deliver).with(to: message.to, body: message.body)
    expect(result).to eq(message)
    expect(message.reload).to have_attributes(status: "sent", twilio_sid: "SM123abc", error_message: nil)
  end

  it "marks the message as failed and stores the reason when sending fails" do
    allow(sender).to receive(:deliver).and_raise(SmsSender::Error, "Invalid 'To' phone number")

    result = described_class.new(sender: sender).call(message)

    expect(result).to eq(message)
    expect(message.reload).to have_attributes(status: "failed", twilio_sid: nil, error_message: "Invalid 'To' phone number")
  end

  it "does not swallow unexpected errors" do
    allow(sender).to receive(:deliver).and_raise(ArgumentError, "bug")

    expect { described_class.new(sender: sender).call(message) }.to raise_error(ArgumentError, "bug")
    expect(message.reload.status).to eq("queued")
  end

  it "uses the configured sender by default" do
    described_class.new.call(message)

    expect(message.reload.twilio_sid).to start_with("FAKE")
  end
end
