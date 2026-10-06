class ApplicationController < ActionController::API
  # Raised when params are first read from a body that isn't valid JSON.
  rescue_from ActionDispatch::Http::Parameters::ParseError do
    render json: { error: "Request body is not valid JSON" }, status: :bad_request
  end

  private
    # Stable anonymous identifier for this browser, stored in the session cookie.
    def current_session_id
      session[:client_id] ||= SecureRandom.uuid
    end
end
