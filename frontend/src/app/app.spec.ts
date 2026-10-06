import { TestBed } from '@angular/core/testing';
import { App } from './app';

describe('App', () => {
  let element: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
    }).compileComponents();

    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    element = fixture.nativeElement as HTMLElement;
  });

  it('renders the page title', () => {
    expect(element.querySelector('h1')?.textContent).toBe('MY SMS MESSENGER');
  });

  it('renders the New Message and Message History cards, in that order', () => {
    const titles = Array.from(element.querySelectorAll('.card h2')).map((h2) => h2.textContent);

    expect(titles).toEqual(['New Message', 'Message History']);
  });

  it('shows the message form in the New Message card', () => {
    const newMessageCard = element.querySelector('section[aria-labelledby="new-message-title"]');

    expect(newMessageCard?.querySelector('app-message-form form')).not.toBeNull();
  });

  it('labels each card with its heading', () => {
    const cards = Array.from(element.querySelectorAll('section.card'));

    for (const card of cards) {
      const heading = card.querySelector('h2');
      expect(card.getAttribute('aria-labelledby')).toBe(heading?.id);
    }
    expect(cards.length).toBe(2);
  });
});
