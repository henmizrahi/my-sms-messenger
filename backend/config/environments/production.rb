require "active_support/core_ext/integer/time"

Rails.application.configure do
  # Settings specified here will take precedence over those in config/application.rb.

  # Code is not reloaded between requests.
  config.enable_reloading = false

  # Eager load code on boot for better performance and memory savings (ignored by Rake tasks).
  config.eager_load = true

  # Full error reports are disabled.
  config.consider_all_requests_local = false

  # Rails serves the built Angular app from public/. index.html is not digest
  # stamped, so make browsers revalidate instead of caching for a fixed time.
  config.public_file_server.headers = { "cache-control" => "public, no-cache" }

  # Enable serving of images, stylesheets, and JavaScripts from an asset server.
  # config.asset_host = "http://assets.example.com"

  # Assume all access to the app is happening through a SSL-terminating reverse proxy.
  config.assume_ssl = true

  # Force all access to the app over SSL, use Strict-Transport-Security, and use secure cookies.
  config.force_ssl = true

  # Skip http-to-https redirect for the default health check endpoint.
  # config.ssl_options = { redirect: { exclude: ->(request) { request.path == "/up" } } }

  # Log to STDOUT with the current request id as a default log tag.
  config.log_tags = [ :request_id ]
  config.logger   = ActiveSupport::TaggedLogging.logger(STDOUT)

  # Change to "debug" to log everything (including potentially personally-identifiable information!).
  config.log_level = ENV.fetch("RAILS_LOG_LEVEL", "info")

  # Prevent health checks from clogging up the logs.
  config.silence_healthcheck_path = "/up"

  # Don't log any deprecations.
  config.active_support.report_deprecations = false

  # The cache only holds rate-limit counters. An in-process store is enough for
  # the single Puma process this app runs as; more processes would need a shared one.
  config.cache_store = :memory_store

  # Enable locale fallbacks for I18n (makes lookups for any locale fall back to
  # the I18n.default_locale when a translation cannot be found).
  config.i18n.fallbacks = true

  # Only answer requests for the expected hosts: Render's domain by default, or a
  # comma-separated list in ALLOWED_HOSTS (for a custom domain or a local run).
  config.hosts = ENV.fetch("ALLOWED_HOSTS", ".onrender.com").split(",")

  # Render's health check does not send the public host name.
  config.host_authorization = { exclude: ->(request) { request.path == "/up" } }
end
