require 'spec_helper'
ENV['RAILS_ENV'] ||= 'test'
require_relative '../config/environment'
abort("The Rails environment is running in production mode!") if Rails.env.production?

# Specs wipe the database before every example, so refuse to run against
# anything but the dedicated test database.
test_database = Mongoid.default_client.database.name
abort("Refusing to run specs against database #{test_database.inspect}") unless test_database == "mysms_test"
require 'rspec/rails'

RSpec.configure do |config|
  config.use_active_record = false

  # Use `create(:message)` / `build(:message)` without the FactoryBot prefix.
  config.include FactoryBot::Syntax::Methods

  # Start every example from an empty database. Mongoid.truncate! deletes all
  # documents but keeps collections and their indexes.
  config.before(:each) { Mongoid.truncate! }

  config.filter_rails_from_backtrace!
end
