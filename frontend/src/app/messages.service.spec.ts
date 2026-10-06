import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { Message } from './message';
import { MessagesService } from './messages.service';

const olderMessage: Message = {
  id: 'message-1',
  to: '+15551234567',
  body: 'The older message.',
  status: 'sent',
  errorMessage: null,
  createdAt: '2020-05-17T09:18:45.000Z',
};

const newerMessage: Message = {
  id: 'message-2',
  to: '+15557654321',
  body: 'The newer message.',
  status: 'sent',
  errorMessage: null,
  createdAt: '2020-05-17T11:18:45.000Z',
};

describe('MessagesService', () => {
  let service: MessagesService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(MessagesService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('starts empty, not loading and without an error', () => {
    expect(service.messages()).toEqual([]);
    expect(service.loading()).toBe(false);
    expect(service.error()).toBeNull();
  });

  describe('load', () => {
    it('fetches the messages and stores them', async () => {
      const loaded = service.load();
      const request = http.expectOne('/api/messages');

      expect(request.request.method).toBe('GET');
      expect(service.loading()).toBe(true);

      request.flush([newerMessage, olderMessage]);
      await loaded;

      expect(service.messages()).toEqual([newerMessage, olderMessage]);
      expect(service.loading()).toBe(false);
      expect(service.error()).toBeNull();
    });

    it('sets an error and stops loading when the request fails', async () => {
      const loaded = service.load();
      http.expectOne('/api/messages').error(new ProgressEvent('error'));
      await loaded;

      expect(service.error()).toBe('Could not load your messages. Please try again.');
      expect(service.loading()).toBe(false);
      expect(service.messages()).toEqual([]);
    });

    it('clears an earlier error when loading again', async () => {
      const failed = service.load();
      http.expectOne('/api/messages').error(new ProgressEvent('error'));
      await failed;

      const retried = service.load();
      expect(service.error()).toBeNull();
      http.expectOne('/api/messages').flush([olderMessage]);
      await retried;

      expect(service.messages()).toEqual([olderMessage]);
    });
  });

  describe('send', () => {
    async function loadMessages(messages: Message[]) {
      const loaded = service.load();
      http.expectOne('/api/messages').flush(messages);
      await loaded;
    }

    it('posts the new message and reports it as saved', async () => {
      const sent = service.send({ to: '+15557654321', body: 'The newer message.' });
      const request = http.expectOne('/api/messages');

      expect(request.request.method).toBe('POST');
      expect(request.request.body).toEqual({ to: '+15557654321', body: 'The newer message.' });

      request.flush(newerMessage, { status: 201, statusText: 'Created' });

      expect(await sent).toEqual({ outcome: 'saved', message: newerMessage });
    });

    it('adds the saved message to the top of the list without refetching', async () => {
      await loadMessages([olderMessage]);

      const sent = service.send({ to: '+15557654321', body: 'The newer message.' });
      http.expectOne('/api/messages').flush(newerMessage, { status: 201, statusText: 'Created' });
      await sent;

      expect(service.messages()).toEqual([newerMessage, olderMessage]);
    });

    it('reports a message saved with status failed as saved, and lists it', async () => {
      const failedMessage: Message = {
        ...newerMessage,
        status: 'failed',
        errorMessage: 'Invalid number',
      };

      const sent = service.send({ to: '+15005550001', body: 'The newer message.' });
      http.expectOne('/api/messages').flush(failedMessage, { status: 201, statusText: 'Created' });

      expect(await sent).toEqual({ outcome: 'saved', message: failedMessage });
      expect(service.messages()).toEqual([failedMessage]);
    });

    it('reports the validation errors on 422 and leaves the list alone', async () => {
      await loadMessages([olderMessage]);

      const sent = service.send({ to: '12345', body: '' });
      http
        .expectOne('/api/messages')
        .flush(
          { errors: { to: ['is invalid'], body: ["can't be blank"] } },
          { status: 422, statusText: 'Unprocessable Content' },
        );

      expect(await sent).toEqual({
        outcome: 'invalid',
        errors: { to: ['is invalid'], body: ["can't be blank"] },
      });
      expect(service.messages()).toEqual([olderMessage]);
    });

    it('reports an error when the network fails', async () => {
      const sent = service.send({ to: '+15557654321', body: 'The newer message.' });
      http.expectOne('/api/messages').error(new ProgressEvent('error'));

      expect(await sent).toEqual({ outcome: 'error' });
      expect(service.messages()).toEqual([]);
    });

    it('reports an error on a server error', async () => {
      const sent = service.send({ to: '+15557654321', body: 'The newer message.' });
      http
        .expectOne('/api/messages')
        .flush('Internal Server Error', { status: 500, statusText: 'Internal Server Error' });

      expect(await sent).toEqual({ outcome: 'error' });
    });
  });
});
