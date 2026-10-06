require_relative "boot"

require "rails"
# Frameworks this app loads; the commented-out ones are disabled.
require "active_model/railtie"
# require "active_job/railtie"
# require "active_record/railtie"
# require "active_storage/engine"
require "action_controller/railtie"
# require "action_mailer/railtie"
# require "action_mailbox/engine"
# require "action_text/engine"
require "action_view/railtie"
# require "action_cable/engine"
# require "rails/test_unit/railtie"

Bundler.require(*Rails.groups)

module MySmsMessenger
  class Application < Rails::Application
    config.load_defaults 8.1

    config.api_only = true

    # API mode drops cookies and sessions; add them back so each browser gets
    # an anonymous session that scopes the messages it can see.
    config.session_store :cookie_store,
      key: "_mysms_session",
      httponly: true,
      same_site: :lax,
      secure: Rails.env.production?
    config.middleware.use ActionDispatch::Cookies
    config.middleware.use config.session_store, config.session_options
  end
end
