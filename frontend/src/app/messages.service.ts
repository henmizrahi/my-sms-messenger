import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { Message, NewMessage } from './message';

export type SendResult =
  | { outcome: 'saved'; message: Message }
  | { outcome: 'invalid'; errors: Record<string, string[]> }
  | { outcome: 'rateLimited' }
  | { outcome: 'error' };

const MESSAGES_URL = '/api/messages';

@Injectable({ providedIn: 'root' })
export class MessagesService {
  private readonly http = inject(HttpClient);

  private readonly messagesState = signal<Message[]>([]);
  private readonly loadingState = signal(false);
  private readonly errorState = signal<string | null>(null);

  readonly messages = this.messagesState.asReadonly();
  readonly loading = this.loadingState.asReadonly();
  readonly error = this.errorState.asReadonly();

  async load(): Promise<void> {
    this.loadingState.set(true);
    this.errorState.set(null);

    try {
      this.messagesState.set(await firstValueFrom(this.http.get<Message[]>(MESSAGES_URL)));
    } catch {
      this.errorState.set('Could not load your messages. Please try again.');
    } finally {
      this.loadingState.set(false);
    }
  }

  async send(newMessage: NewMessage): Promise<SendResult> {
    try {
      const message = await firstValueFrom(this.http.post<Message>(MESSAGES_URL, newMessage));
      // Reload rather than insert locally, so the list always reflects the server and a
      // history that failed to load earlier recovers.
      await this.load();

      return { outcome: 'saved', message };
    } catch (error) {
      if (error instanceof HttpErrorResponse && error.status === 422) {
        return { outcome: 'invalid', errors: error.error?.errors ?? {} };
      }
      if (error instanceof HttpErrorResponse && error.status === 429) {
        return { outcome: 'rateLimited' };
      }

      return { outcome: 'error' };
    }
  }
}
