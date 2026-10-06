import { Component } from '@angular/core';

import { MessageForm } from './message-form/message-form';

@Component({
  imports: [MessageForm],
  selector: 'app-root',
  styleUrl: './app.scss',
  templateUrl: './app.html',
})
export class App {}
