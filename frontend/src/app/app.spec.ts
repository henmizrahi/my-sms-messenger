import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';

import { App } from './app';
import { Message } from './message';
import { MessagesService, SendResult } from './messages.service';

const savedMessage: Message = {
  id: 'message-1',
  to: '+15551234567',
  body: 'Hello there',
  status: 'sent',
  errorMessage: null,
  createdAt: '2020-05-17T11:18:45.000Z',
};

describe('App', () => {
  let fixture: ComponentFixture<App>;
  let element: HTMLElement;
  let resolveSend: (result: SendResult) => void;

  const service = {
    messages: signal<Message[]>([]),
    loading: signal(false),
    error: signal<string | null>(null),
    load: vi.fn(() => Promise.resolve()),
    send: vi.fn(() => new Promise<SendResult>((resolve) => (resolveSend = resolve))),
  };

  const phone = () => element.querySelector<HTMLInputElement>('#message-to')!;
  const body = () => element.querySelector<HTMLTextAreaElement>('#message-body')!;
  const submitButton = () => element.querySelector<HTMLButtonElement>('button[type="submit"]')!;
  const formError = () => element.querySelector('.form__error')?.textContent ?? null;

  async function submitForm(to = '+1 (555) 123-4567', message = 'Hello there') {
    phone().value = to;
    phone().dispatchEvent(new Event('input'));
    body().value = message;
    body().dispatchEvent(new Event('input'));
    await fixture.whenStable();
    submitButton().click();
    await fixture.whenStable();
  }

  async function finishSend(result: SendResult) {
    resolveSend(result);
    // Let App's `await` continue before asking Angular to settle.
    await new Promise((resolve) => setTimeout(resolve));
    await fixture.whenStable();
  }

  beforeEach(async () => {
    service.messages.set([]);
    service.loading.set(false);
    service.error.set(null);
    vi.clearAllMocks();

    await TestBed.configureTestingModule({
      imports: [App],
      providers: [{ provide: MessagesService, useValue: service }],
    }).compileComponents();

    fixture = TestBed.createComponent(App);
    element = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
  });

  it('renders the page title', () => {
    expect(element.querySelector('h1')?.textContent).toBe('MY SMS MESSENGER');
  });

  it('places the message form in the first card and the message history in the second', () => {
    const cards = Array.from(element.querySelectorAll('section.card'));

    expect(cards.length).toBe(2);
    expect(cards[0].querySelector('app-message-form form')).not.toBeNull();
    expect(cards[1].querySelector('app-message-history')).not.toBeNull();
  });

  it('labels each card with the heading its component renders', () => {
    const cards = Array.from(element.querySelectorAll('section.card'));
    const headings = cards.map((card) => card.querySelector('h2'));

    expect(headings.map((heading) => heading?.textContent)).toEqual([
      'New Message',
      'Message History (0)',
    ]);
    expect(cards.map((card) => card.getAttribute('aria-labelledby'))).toEqual(
      headings.map((heading) => heading?.id),
    );
  });

  describe('message history', () => {
    it('loads the messages once on init', () => {
      expect(service.load).toHaveBeenCalledTimes(1);
    });

    it("shows the service's messages", async () => {
      service.messages.set([savedMessage]);
      await fixture.whenStable();

      expect(element.querySelector('h2#message-history-title')?.textContent).toBe(
        'Message History (1)',
      );
      expect(element.querySelector('.message__body')?.textContent).toBe('Hello there');
    });

    it('shows the loading state', async () => {
      service.loading.set(true);
      await fixture.whenStable();

      expect(element.querySelector('.history__state')?.textContent).toBe('Loading messages…');
    });

    it('shows the load error', async () => {
      service.error.set('Could not load your messages. Please try again.');
      await fixture.whenStable();

      expect(element.querySelector('.history__message')?.textContent).toBe(
        'Could not load your messages. Please try again.',
      );
    });

    it('loads again when Try again is clicked', async () => {
      service.error.set('Could not load your messages. Please try again.');
      await fixture.whenStable();

      element.querySelector<HTMLButtonElement>('.history__retry')!.click();

      expect(service.load).toHaveBeenCalledTimes(2);
    });
  });

  describe('sending a message', () => {
    it('passes the form values to the service and shows the sending state', async () => {
      await submitForm();

      expect(service.send).toHaveBeenCalledExactlyOnceWith({
        to: '+15551234567',
        body: 'Hello there',
      });
      expect(submitButton().textContent.trim()).toBe('Sending…');
      expect(submitButton().disabled).toBe(true);
    });

    it('clears the form when the message is saved', async () => {
      await submitForm();
      await finishSend({ outcome: 'saved', message: savedMessage });

      expect(phone().value).toBe('');
      expect(body().value).toBe('');
      expect(formError()).toBeNull();
      expect(submitButton().textContent.trim()).toBe('Submit');
    });

    it('also clears the form when the saved message failed to deliver', async () => {
      await submitForm('+15005550001');
      await finishSend({
        outcome: 'saved',
        message: { ...savedMessage, status: 'failed', errorMessage: "Invalid 'To' phone number" },
      });

      expect(phone().value).toBe('');
      expect(body().value).toBe('');
      expect(formError()).toBeNull();
    });

    it('keeps the values and shows a readable message on validation errors', async () => {
      await submitForm();
      await finishSend({
        outcome: 'invalid',
        errors: {
          to: ['is invalid'],
          body: ["can't be blank", 'is too long (maximum is 250 characters)'],
        },
      });

      expect(formError()).toBe(
        "Phone number is invalid. Message can't be blank. Message is too long (maximum is 250 characters).",
      );
      expect(phone().value).toBe('+1 (555) 123-4567');
      expect(body().value).toBe('Hello there');
      expect(submitButton().disabled).toBe(false);
    });

    it('shows a fallback when the server reports no specific validation error', async () => {
      await submitForm();
      await finishSend({ outcome: 'invalid', errors: {} });

      expect(formError()).toBe('The message could not be saved.');
    });

    it('keeps the values and shows a generic message on a network or server error', async () => {
      await submitForm();
      await finishSend({ outcome: 'error' });

      expect(formError()).toBe('Could not send the message. Please try again.');
      expect(phone().value).toBe('+1 (555) 123-4567');
      expect(body().value).toBe('Hello there');
      expect(submitButton().disabled).toBe(false);
    });

    it('removes the previous error when sending again', async () => {
      await submitForm();
      await finishSend({ outcome: 'error' });

      submitButton().click();
      await fixture.whenStable();

      expect(formError()).toBeNull();
      expect(service.send).toHaveBeenCalledTimes(2);
    });
  });
});

describe('App with the real MessagesService', () => {
  let fixture: ComponentFixture<App>;
  let element: HTMLElement;
  let http: HttpTestingController;

  // Lets pending promises continue, then waits for Angular to render the result.
  async function settle() {
    await new Promise((resolve) => setTimeout(resolve));
    await fixture.whenStable();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(App);
    element = fixture.nativeElement as HTMLElement;
    http = TestBed.inject(HttpTestingController);
    await fixture.whenStable();
  });

  afterEach(() => http.verify());

  it('shows the history after a send succeeds, even though the first load failed', async () => {
    http.expectOne({ method: 'GET', url: '/api/messages' }).error(new ProgressEvent('error'));
    await settle();
    expect(element.querySelector('.history__message')?.textContent).toBe(
      'Could not load your messages. Please try again.',
    );

    const phone = element.querySelector<HTMLInputElement>('#message-to')!;
    const body = element.querySelector<HTMLTextAreaElement>('#message-body')!;
    phone.value = '+15551234567';
    phone.dispatchEvent(new Event('input'));
    body.value = 'Hello there';
    body.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    element.querySelector<HTMLButtonElement>('button[type="submit"]')!.click();

    http
      .expectOne({ method: 'POST', url: '/api/messages' })
      .flush(savedMessage, { status: 201, statusText: 'Created' });
    await settle();
    http.expectOne({ method: 'GET', url: '/api/messages' }).flush([savedMessage]);
    await settle();

    expect(element.querySelector('.history__state--error')).toBeNull();
    expect(element.querySelector('h2#message-history-title')?.textContent).toBe(
      'Message History (1)',
    );
    expect(element.querySelector('.message__body')?.textContent).toBe('Hello there');
    expect(phone.value).toBe('');
  });

  it('reloads the history when Try again is clicked', async () => {
    http.expectOne({ method: 'GET', url: '/api/messages' }).error(new ProgressEvent('error'));
    await settle();

    element.querySelector<HTMLButtonElement>('.history__retry')!.click();
    http.expectOne({ method: 'GET', url: '/api/messages' }).flush([savedMessage]);
    await settle();

    expect(element.querySelector('.history__state--error')).toBeNull();
    expect(element.querySelector('.message__body')?.textContent).toBe('Hello there');
  });
});
