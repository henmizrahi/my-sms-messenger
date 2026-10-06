# Fail at boot, not on the first message, when the SMS provider is misconfigured.
Rails.application.config.to_prepare do
  SmsSender.verify_configuration!
end
