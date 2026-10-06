import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Message } from '../message';
import { MessageCard } from './message-card';

const sentMessage: Message = {
  id: 'message-1',
  to: '+15551234567',
  body: 'Hi! This is a message.',
  status: 'sent',
  errorMessage: null,
  createdAt: '2020-05-17T11:18:45.000Z',
};

describe('MessageCard', () => {
  let fixture: ComponentFixture<MessageCard>;
  let element: HTMLElement;

  const text = (selector: string) => element.querySelector(selector)?.textContent.trim();

  async function render(message: Message) {
    fixture.componentRef.setInput('message', message);
    await fixture.whenStable();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [MessageCard] }).compileComponents();

    fixture = TestBed.createComponent(MessageCard);
    element = fixture.nativeElement as HTMLElement;
  });

  it('shows the phone number and the message body', async () => {
    await render(sentMessage);

    expect(text('.message__to')).toBe('+15551234567');
    expect(text('.message__body')).toBe('Hi! This is a message.');
  });

  it('shows the date as weekday, day-month-year and time in UTC', async () => {
    await render(sentMessage);

    expect(text('.message__date')).toBe('Sunday, 17-May-20 11:18:45 UTC');
    expect(element.querySelector('time')?.getAttribute('datetime')).toBe(
      '2020-05-17T11:18:45.000Z',
    );
  });

  it('pads single-digit days and uses the 24-hour clock', async () => {
    await render({ ...sentMessage, createdAt: '2026-10-06T21:05:09.123Z' });

    expect(text('.message__date')).toBe('Tuesday, 06-Oct-26 21:05:09 UTC');
  });

  it('shows the body length out of 250', async () => {
    await render(sentMessage);

    expect(text('.message__counter')).toBe('22/250');
  });

  it('keeps line breaks in the body', async () => {
    await render({ ...sentMessage, body: 'First line\nSecond line' });

    expect(element.querySelector('.message__body')?.textContent).toBe('First line\nSecond line');
  });

  it.each(['sent', 'queued'] as const)(
    'shows no badge or error for a %s message',
    async (status) => {
      await render({ ...sentMessage, status });

      expect(element.querySelector('.message__badge')).toBeNull();
      expect(element.querySelector('.message__error')).toBeNull();
    },
  );

  it('shows a Failed badge and the reason for a failed message', async () => {
    await render({ ...sentMessage, status: 'failed', errorMessage: "Invalid 'To' phone number" });

    expect(text('.message__badge')).toBe('Failed');
    expect(text('.message__error')).toBe("Invalid 'To' phone number");
  });

  it('shows only the badge when a failed message has no reason', async () => {
    await render({ ...sentMessage, status: 'failed', errorMessage: null });

    expect(text('.message__badge')).toBe('Failed');
    expect(element.querySelector('.message__error')).toBeNull();
  });
});
