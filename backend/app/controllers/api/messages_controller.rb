module Api
  class MessagesController < ApplicationController
    HISTORY_LIMIT = 100

    # Sending is limited per browser session, with a looser per-address limit behind
    # it, because a client can get a new session just by dropping its cookie.
    rate_limit to: 10, within: 1.minute, only: :create, name: "session",
      by: :current_session_id, with: :too_many_messages
    rate_limit to: 60, within: 1.minute, only: :create, name: "address", with: :too_many_messages

    def index
      messages = Message.where(session_id: current_session_id).order(created_at: :desc).limit(HISTORY_LIMIT)

      render json: MessageSerializer.render_many(messages)
    end

    def create
      message = Message.new(message_params)
      # Ownership comes from the session cookie, never from the request body.
      message.session_id = current_session_id

      if message.save
        MessageDelivery.new.call(message)
        render json: MessageSerializer.render(message), status: :created
      else
        render json: { errors: message.errors.messages }, status: :unprocessable_content
      end
    end

    private
      def message_params
        params.permit(:to, :body)
      end

      def too_many_messages
        render json: { error: "Too many messages. Wait a minute and try again." }, status: :too_many_requests
      end
  end
end
