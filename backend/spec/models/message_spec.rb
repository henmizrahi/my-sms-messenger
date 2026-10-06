require "rails_helper"

RSpec.describe Message do
  it "saves a valid message" do
    message = build(:message)

    expect(message.save).to be(true)
    expect(Message.count).to eq(1)
  end

  it "sets created_at and updated_at on save" do
    message = create(:message)

    expect(message.created_at).to be_present
    expect(message.updated_at).to be_present
  end

  describe "status" do
    it "defaults to queued" do
      expect(Message.new.status).to eq("queued")
    end

    it "accepts each allowed value" do
      %w[queued sent failed].each do |status|
        expect(build(:message, status: status)).to be_valid
      end
    end

    it "is invalid outside the allowed values" do
      message = build(:message, status: "delivered")

      expect(message).not_to be_valid
      expect(message.errors[:status]).to include("is not included in the list")
    end
  end

  describe "body" do
    it "is invalid when missing" do
      message = build(:message, body: nil)

      expect(message).not_to be_valid
      expect(message.errors[:body]).to include("can't be blank")
    end

    it "is invalid when it is only whitespace" do
      message = build(:message, body: "  \n\t ")

      expect(message).not_to be_valid
      expect(message.errors[:body]).to include("can't be blank")
    end

    it "is valid at exactly 250 characters" do
      expect(build(:message, body: "a" * 250)).to be_valid
    end

    it "is invalid at 251 characters" do
      message = build(:message, body: "a" * 251)

      expect(message).not_to be_valid
      expect(message.errors[:body]).to include("is too long (maximum is 250 characters)")
    end
  end

  describe "session_id" do
    it "is invalid when missing" do
      message = build(:message, session_id: nil)

      expect(message).not_to be_valid
      expect(message.errors[:session_id]).to include("can't be blank")
    end
  end

  describe "to" do
    it "is invalid when missing" do
      message = build(:message, to: nil)

      expect(message).not_to be_valid
      # Only the presence error: the format check is skipped for blank values.
      expect(message.errors[:to]).to eq([ "can't be blank" ])
    end

    {
      "no leading +" => "15551234567",
      "a leading 0 after the +" => "+0501234567",
      "too few digits (7)" => "+1234567",
      "too many digits (16)" => "+1234567890123456",
      "letters" => "+1555abc4567"
    }.each do |description, number|
      it "is invalid with #{description}" do
        message = build(:message, to: number)

        expect(message).not_to be_valid
        expect(message.errors[:to]).to include("is invalid")
      end
    end

    it "is valid at the shortest (8) and longest (15) digit lengths" do
      expect(build(:message, to: "+12345678")).to be_valid
      expect(build(:message, to: "+123456789012345")).to be_valid
    end

    it "normalizes spaces, dashes and parentheses before validating" do
      message = build(:message, to: "+1 (555) 123-4567")

      expect(message).to be_valid
      expect(message.to).to eq("+15551234567")
    end

    it "stores the normalized number" do
      message = create(:message, to: "+1 (555) 123-4567")

      expect(message.reload.to).to eq("+15551234567")
    end
  end
end
