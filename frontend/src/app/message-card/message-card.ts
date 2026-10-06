import { DatePipe } from '@angular/common';
import { Component, computed, input } from '@angular/core';

import { MAX_BODY_LENGTH, Message } from '../message';

@Component({
  imports: [DatePipe],
  selector: 'app-message-card',
  styleUrl: './message-card.scss',
  templateUrl: './message-card.html',
})
export class MessageCard {
  readonly message = input.required<Message>();

  protected readonly failed = computed(() => this.message().status === 'failed');
  protected readonly maxBodyLength = MAX_BODY_LENGTH;
  protected readonly dateFormat = "EEEE, dd-MMM-yy HH:mm:ss 'UTC'";
}
