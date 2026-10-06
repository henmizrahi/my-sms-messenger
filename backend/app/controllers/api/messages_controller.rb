module Api
  class MessagesController < ApplicationController
    def index
      messages = Message.where(session_id: current_session_id).order(created_at: :desc)

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
  end
end
