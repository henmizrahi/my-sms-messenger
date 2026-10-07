import { Component, input, output } from '@angular/core';

import { Message } from '../message';
import { MessageCard } from '../message-card/message-card';

@Component({
  imports: [MessageCard],
  selector: 'app-message-history',
  styleUrl: './message-history.scss',
  templateUrl: './message-history.html',
})
export class MessageHistory {
  readonly messages = input.required<Message[]>();
  readonly loading = input(false);
  readonly error = input<string | null>(null);

  readonly retry = output<void>();
}
