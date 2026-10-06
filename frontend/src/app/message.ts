// Mirrors the body length limit of the Message model in the Rails API.
export const MAX_BODY_LENGTH = 250;

export type MessageStatus = 'queued' | 'sent' | 'failed';

export interface Message {
  id: string;
  to: string;
  body: string;
  status: MessageStatus;
  errorMessage: string | null;
  createdAt: string;
}

export type NewMessage = Pick<Message, 'to' | 'body'>;
