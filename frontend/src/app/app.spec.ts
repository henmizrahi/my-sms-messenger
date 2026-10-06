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

  it('places the message form in the first card and the message history in the second', () => {
    const cards = Array.from(element.querySelectorAll('section.card'));

    expect(cards.length).toBe(2);
    expect(cards[0].querySelector('app-message-form form')).not.toBeNull();
    expect(cards[1].querySelector('app-message-history')?.textContent).toContain('No messages yet');
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
});
