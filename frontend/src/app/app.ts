import { Component, OnInit, inject, signal } from '@angular/core';

import { NewMessage } from './message';
import { MessageForm } from './message-form/message-form';
import { MessageHistory } from './message-history/message-history';
import { MessagesService } from './messages.service';

const FIELD_LABELS: Record<string, string> = { to: 'Phone number', body: 'Message' };

function describeValidationErrors(errors: Record<string, string[]>): string {
  const sentences = Object.entries(errors).flatMap(([field, problems]) =>
    problems.map((problem) => `${FIELD_LABELS[field] ?? field} ${problem}.`),
  );

  return sentences.join(' ') || 'The message could not be saved.';
}

@Component({
  imports: [MessageForm, MessageHistory],
  selector: 'app-root',
  styleUrl: './app.scss',
  templateUrl: './app.html',
})
export class App implements OnInit {
  protected readonly messagesService = inject(MessagesService);

  protected readonly sending = signal(false);
  protected readonly sendError = signal<string | null>(null);
  protected readonly sentMessageId = signal<string | null>(null);

  ngOnInit(): void {
    void this.messagesService.load();
  }

  protected async send(newMessage: NewMessage): Promise<void> {
    this.sending.set(true);
    this.sendError.set(null);

    const result = await this.messagesService.send(newMessage);

    this.sending.set(false);
    switch (result.outcome) {
      case 'saved':
        // Saved messages clear the form even when delivery failed; the card shows why.
        this.sentMessageId.set(result.message.id);
        break;
      case 'invalid':
        this.sendError.set(describeValidationErrors(result.errors));
        break;
      case 'error':
        this.sendError.set('Could not send the message. Please try again.');
        break;
    }
  }
}
