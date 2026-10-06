RSpec.configure do |config|
  config.expect_with :rspec do |expectations|
    expectations.include_chain_clauses_in_custom_matcher_descriptions = true
  end

  config.mock_with :rspec do |mocks|
    mocks.verify_partial_doubles = true
  end

  config.shared_context_metadata_behavior = :apply_to_host_groups

  # Run examples in random order so they can't silently depend on each other.
  # Reproduce a failing order with `--seed <number>` (printed after each run).
  config.order = :random
  Kernel.srand config.seed
end
