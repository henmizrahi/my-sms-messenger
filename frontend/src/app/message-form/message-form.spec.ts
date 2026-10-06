import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NewMessage } from '../message';
import { MessageForm } from './message-form';

describe('MessageForm', () => {
  let fixture: ComponentFixture<MessageForm>;
  let element: HTMLElement;
  let submissions: NewMessage[];

  const phone = () => element.querySelector<HTMLInputElement>('#message-to')!;
  const body = () => element.querySelector<HTMLTextAreaElement>('#message-body')!;
  const submitButton = () => element.querySelector<HTMLButtonElement>('button[type="submit"]')!;
  const clearButton = () => element.querySelector<HTMLButtonElement>('button[type="button"]')!;
  const counter = () => element.querySelector('.field__counter')!.textContent.trim();
  const fieldErrors = () =>
    Array.from(element.querySelectorAll('.field__error')).map((error) => error.textContent.trim());

  async function type(control: HTMLInputElement | HTMLTextAreaElement, value: string) {
    control.value = value;
    control.dispatchEvent(new Event('input'));
    await fixture.whenStable();
  }

  async function blur(control: HTMLElement) {
    control.dispatchEvent(new Event('blur'));
    await fixture.whenStable();
  }

  async function fillValidMessage() {
    await type(phone(), '+15551234567');
    await type(body(), 'Hello there');
  }

  async function setInput(name: string, value: unknown) {
    fixture.componentRef.setInput(name, value);
    await fixture.whenStable();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [MessageForm] }).compileComponents();

    fixture = TestBed.createComponent(MessageForm);
    element = fixture.nativeElement as HTMLElement;
    submissions = [];
    fixture.componentInstance.submitted.subscribe((message) => submissions.push(message));
    await fixture.whenStable();
  });

  describe('validation', () => {
    it('shows no errors before a field is touched', () => {
      expect(fieldErrors()).toEqual([]);
    });

    it('requires a phone number once the field is touched', async () => {
      await blur(phone());

      expect(fieldErrors()).toEqual(['Phone number is required.']);
      expect(phone().getAttribute('aria-invalid')).toBe('true');
    });

    it.each(['15551234567', '+0501234567', '+1234567', '+1234567890123456', '+1555abc4567'])(
      'rejects the phone number %s',
      async (value) => {
        await type(phone(), value);
        await blur(phone());

        expect(fieldErrors()).toEqual([
          'Enter the number in international format, for example +15551234567.',
        ]);
      },
    );

    it.each(['+15551234567', '+12345678', '+123456789012345', '+1 (555) 123-4567'])(
      'accepts the phone number %s',
      async (value) => {
        await type(phone(), value);
        await blur(phone());

        expect(fieldErrors()).toEqual([]);
      },
    );

    it('requires a message once the field is touched', async () => {
      await blur(body());

      expect(fieldErrors()).toEqual(['Message is required.']);
    });

    it('treats a whitespace-only message as missing', async () => {
      await type(body(), '   \n ');
      await blur(body());

      expect(fieldErrors()).toEqual(['Message is required.']);
    });

    it('accepts a message of exactly 250 characters', async () => {
      await type(body(), 'a'.repeat(250));
      await blur(body());

      expect(fieldErrors()).toEqual([]);
    });

    it('rejects a message of 251 characters', async () => {
      await type(body(), 'a'.repeat(251));
      await blur(body());

      expect(fieldErrors()).toEqual(['Message must be 250 characters or fewer.']);
    });
  });

  describe('counter', () => {
    it('starts at 0/250', () => {
      expect(counter()).toBe('0/250');
    });

    it('follows the message length', async () => {
      await type(body(), 'Hello');

      expect(counter()).toBe('5/250');
    });

    it('is highlighted when the message is too long', async () => {
      await type(body(), 'a'.repeat(251));

      expect(counter()).toBe('251/250');
      expect(element.querySelector('.field__counter--over')).not.toBeNull();
    });
  });

  describe('submit button', () => {
    it('is disabled while the form is empty', () => {
      expect(submitButton().disabled).toBe(true);
    });

    it('is disabled while a field is invalid', async () => {
      await type(phone(), '12345');
      await type(body(), 'Hello there');

      expect(submitButton().disabled).toBe(true);
    });

    it('is enabled when the form is valid', async () => {
      await fillValidMessage();

      expect(submitButton().disabled).toBe(false);
    });

    it('is disabled and relabelled while sending', async () => {
      await fillValidMessage();
      await setInput('sending', true);

      expect(submitButton().disabled).toBe(true);
      expect(submitButton().textContent.trim()).toBe('Sending…');
    });
  });

  describe('submitted output', () => {
    it('emits the phone number and message', async () => {
      await fillValidMessage();
      submitButton().click();

      expect(submissions).toEqual([{ to: '+15551234567', body: 'Hello there' }]);
    });

    it('emits the phone number without spaces, dashes or parentheses', async () => {
      await type(phone(), '+1 (555) 123-4567');
      await type(body(), 'Hello there');
      submitButton().click();

      expect(submissions).toEqual([{ to: '+15551234567', body: 'Hello there' }]);
    });

    it('emits nothing when the form is invalid', async () => {
      await type(body(), 'Hello there');
      element.querySelector('form')!.dispatchEvent(new Event('submit'));

      expect(submissions).toEqual([]);
    });

    it('emits nothing while sending', async () => {
      await fillValidMessage();
      await setInput('sending', true);
      element.querySelector('form')!.dispatchEvent(new Event('submit'));

      expect(submissions).toEqual([]);
    });
  });

  describe('Clear', () => {
    it('empties the fields, the counter and the validation errors', async () => {
      await type(phone(), '12345');
      await blur(phone());
      await type(body(), 'Hello there');

      clearButton().click();
      await fixture.whenStable();

      expect(phone().value).toBe('');
      expect(body().value).toBe('');
      expect(counter()).toBe('0/250');
      expect(fieldErrors()).toEqual([]);
      expect(submitButton().disabled).toBe(true);
    });

    it('dismisses the error message', async () => {
      await setInput('errorMessage', 'Could not send the message.');

      clearButton().click();
      await fixture.whenStable();

      expect(element.querySelector('.form__error')).toBeNull();
    });
  });

  describe('after sending', () => {
    it('clears itself when the parent reports a sent message', async () => {
      await fillValidMessage();
      await blur(body());

      await setInput('sentMessageId', 'message-1');

      expect(phone().value).toBe('');
      expect(body().value).toBe('');
      expect(counter()).toBe('0/250');
      expect(fieldErrors()).toEqual([]);
    });

    it('clears itself again for the next sent message', async () => {
      await setInput('sentMessageId', 'message-1');
      await fillValidMessage();

      await setInput('sentMessageId', 'message-2');

      expect(phone().value).toBe('');
      expect(body().value).toBe('');
    });

    it('keeps the values and shows the error when sending fails', async () => {
      await fillValidMessage();
      await setInput('sending', true);

      await setInput('sending', false);
      await setInput('errorMessage', 'Could not send the message.');

      expect(phone().value).toBe('+15551234567');
      expect(body().value).toBe('Hello there');
      expect(element.querySelector('.form__error')?.textContent).toBe(
        'Could not send the message.',
      );
      expect(element.querySelector('.form__error')?.getAttribute('role')).toBe('alert');
      expect(submitButton().disabled).toBe(false);
    });

    it('shows a new error after an earlier one was dismissed', async () => {
      await setInput('errorMessage', 'First error.');
      clearButton().click();
      await fixture.whenStable();

      await setInput('errorMessage', 'Second error.');

      expect(element.querySelector('.form__error')?.textContent).toBe('Second error.');
    });
  });
});
