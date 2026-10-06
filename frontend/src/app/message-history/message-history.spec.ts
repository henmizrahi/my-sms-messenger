import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Message } from '../message';
import { MessageHistory } from './message-history';

const messages: Message[] = [
  {
    id: 'message-2',
    to: '+15557654321',
    body: 'The newer message.',
    status: 'failed',
    errorMessage: "Invalid 'To' phone number",
    createdAt: '2020-05-17T11:18:45.000Z',
  },
  {
    id: 'message-1',
    to: '+15551234567',
    body: 'The older message.',
    status: 'sent',
    errorMessage: null,
    createdAt: '2020-05-17T09:18:45.000Z',
  },
];

describe('MessageHistory', () => {
  let fixture: ComponentFixture<MessageHistory>;
  let element: HTMLElement;

  const heading = () => element.querySelector('h2')?.textContent.trim();
  const state = () => element.querySelector('.history__state');
  const cards = () => Array.from(element.querySelectorAll('app-message-card'));

  async function render(inputs: { messages: Message[]; loading?: boolean; error?: string | null }) {
    for (const [name, value] of Object.entries(inputs)) {
      fixture.componentRef.setInput(name, value);
    }
    await fixture.whenStable();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [MessageHistory] }).compileComponents();

    fixture = TestBed.createComponent(MessageHistory);
    element = fixture.nativeElement as HTMLElement;
  });

  describe('with messages', () => {
    beforeEach(() => render({ messages }));

    it('shows the number of messages in the heading', () => {
      expect(heading()).toBe('Message History (2)');
    });

    it('renders one card per message, in the order given', () => {
      const recipients = cards().map((card) =>
        card.querySelector('.message__to')?.textContent.trim(),
      );

      expect(recipients).toEqual(['+15557654321', '+15551234567']);
    });

    it('renders each card inside a list item', () => {
      expect(element.querySelectorAll('ul.history__list > li > app-message-card').length).toBe(2);
    });

    it('shows each message date in the wireframe format', () => {
      const dates = cards().map((card) => card.querySelector('.message__date')?.textContent.trim());

      expect(dates).toEqual(['Sunday, 17-May-20 11:18:45 UTC', 'Sunday, 17-May-20 09:18:45 UTC']);
    });

    it('marks only the failed message with a Failed badge', () => {
      const badges = cards().map(
        (card) => card.querySelector('.message__badge')?.textContent.trim() ?? null,
      );

      expect(badges).toEqual(['Failed', null]);
    });

    it('shows no empty, loading or error state', () => {
      expect(state()).toBeNull();
    });

    it('makes the scrollable list reachable by keyboard and names it after the heading', () => {
      const list = element.querySelector('.history__list');

      expect(list?.getAttribute('tabindex')).toBe('0');
      expect(list?.getAttribute('aria-labelledby')).toBe(element.querySelector('h2')?.id);
    });
  });

  describe('empty state', () => {
    beforeEach(() => render({ messages: [] }));

    it('shows a zero count and "No messages yet"', () => {
      expect(heading()).toBe('Message History (0)');
      expect(state()?.textContent.trim()).toBe('No messages yet');
    });

    it('renders no list', () => {
      expect(element.querySelector('.history__list')).toBeNull();
    });
  });

  describe('loading state', () => {
    it('shows a loading status and not the empty state', async () => {
      await render({ messages: [], loading: true });

      expect(state()?.textContent.trim()).toBe('Loading messages…');
      expect(state()?.getAttribute('role')).toBe('status');
    });
  });

  describe('error state', () => {
    it('shows the error as an alert', async () => {
      await render({ messages: [], error: 'Could not load your messages.' });

      expect(state()?.textContent.trim()).toBe('Could not load your messages.');
      expect(state()?.getAttribute('role')).toBe('alert');
    });

    it('takes priority over the loading state', async () => {
      await render({ messages: [], loading: true, error: 'Could not load your messages.' });

      expect(state()?.textContent.trim()).toBe('Could not load your messages.');
    });
  });
});
