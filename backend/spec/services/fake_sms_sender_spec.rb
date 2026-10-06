require "rails_helper"

RSpec.describe FakeSmsSender do
  subject(:sender) { described_class.new }

  it "returns a fake SID" do
    expect(sender.deliver(to: "+15551234567", body: "Hi")).to match(/\AFAKE\h{32}\z/)
  end

  it "returns a different SID each time" do
    first = sender.deliver(to: "+15551234567", body: "Hi")
    second = sender.deliver(to: "+15551234567", body: "Hi")

    expect(first).not_to eq(second)
  end

  it "fails for the magic invalid number" do
    expect { sender.deliver(to: "+15005550001", body: "Hi") }
      .to raise_error(SmsSender::Error, "Invalid 'To' phone number")
  end

  it "needs no configuration" do
    expect(described_class.missing_configuration).to eq([])
  end
end
