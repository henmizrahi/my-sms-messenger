import { Component } from '@angular/core';

import { MessageForm } from './message-form/message-form';
import { MessageHistory } from './message-history/message-history';

@Component({
  imports: [MessageForm, MessageHistory],
  selector: 'app-root',
  styleUrl: './app.scss',
  templateUrl: './app.html',
})
export class App {}
