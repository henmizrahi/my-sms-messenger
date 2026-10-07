import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { Message, NewMessage } from './message';
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
    const created = { status: 201, statusText: 'Created' };

    // Lets the service continue past an awaited response and issue its next request.
    const nextRequest = () => new Promise((resolve) => setTimeout(resolve));

    async function loadMessages(messages: Message[]) {
      const loaded = service.load();
      http.expectOne('/api/messages').flush(messages);
      await loaded;
    }

    async function sendAndReload(newMessage: NewMessage, saved: Message, reloaded: Message[]) {
      const sent = service.send(newMessage);
      http.expectOne({ method: 'POST', url: '/api/messages' }).flush(saved, created);
      await nextRequest();
      http.expectOne({ method: 'GET', url: '/api/messages' }).flush(reloaded);

      return sent;
    }

    it('posts the new message and reports it as saved', async () => {
      const sent = service.send({ to: '+15557654321', body: 'The newer message.' });
      const request = http.expectOne({ method: 'POST', url: '/api/messages' });

      expect(request.request.body).toEqual({ to: '+15557654321', body: 'The newer message.' });

      request.flush(newerMessage, created);
      await nextRequest();
      http.expectOne({ method: 'GET', url: '/api/messages' }).flush([newerMessage]);

      expect(await sent).toEqual({ outcome: 'saved', message: newerMessage });
    });

    it('reloads the list from the server after a message is saved', async () => {
      await loadMessages([olderMessage]);

      await sendAndReload({ to: '+15557654321', body: 'The newer message.' }, newerMessage, [
        newerMessage,
        olderMessage,
      ]);

      expect(service.messages()).toEqual([newerMessage, olderMessage]);
      expect(service.loading()).toBe(false);
    });

    it('recovers the history when the first load failed and a later send succeeds', async () => {
      const failed = service.load();
      http.expectOne('/api/messages').error(new ProgressEvent('error'));
      await failed;
      expect(service.error()).not.toBeNull();

      await sendAndReload({ to: '+15557654321', body: 'The newer message.' }, newerMessage, [
        newerMessage,
        olderMessage,
      ]);

      expect(service.error()).toBeNull();
      expect(service.messages()).toEqual([newerMessage, olderMessage]);
    });

    it('still reports the message as saved when the reload fails, and sets the load error', async () => {
      const sent = service.send({ to: '+15557654321', body: 'The newer message.' });
      http.expectOne({ method: 'POST', url: '/api/messages' }).flush(newerMessage, created);
      await nextRequest();
      http.expectOne({ method: 'GET', url: '/api/messages' }).error(new ProgressEvent('error'));

      expect(await sent).toEqual({ outcome: 'saved', message: newerMessage });
      expect(service.error()).toBe('Could not load your messages. Please try again.');
    });

    it('reports a message saved with status failed as saved, and lists it', async () => {
      const failedMessage: Message = {
        ...newerMessage,
        status: 'failed',
        errorMessage: 'Invalid number',
      };

      const result = await sendAndReload(
        { to: '+15005550001', body: 'The newer message.' },
        failedMessage,
        [failedMessage],
      );

      expect(result).toEqual({ outcome: 'saved', message: failedMessage });
      expect(service.messages()).toEqual([failedMessage]);
    });

    it('reports the validation errors on 422 without reloading', async () => {
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

    it('reports a rate limit on 429, without reloading', async () => {
      const sent = service.send({ to: '+15557654321', body: 'The newer message.' });
      http
        .expectOne('/api/messages')
        .flush(
          { error: 'Too many messages. Wait a minute and try again.' },
          { status: 429, statusText: 'Too Many Requests' },
        );

      expect(await sent).toEqual({ outcome: 'rateLimited' });
      expect(service.messages()).toEqual([]);
    });

    it('reports an error when the network fails, without reloading', async () => {
      const sent = service.send({ to: '+15557654321', body: 'The newer message.' });
      http.expectOne('/api/messages').error(new ProgressEvent('error'));

      expect(await sent).toEqual({ outcome: 'error' });
      expect(service.messages()).toEqual([]);
    });

    it('reports an error on a server error, without reloading', async () => {
      const sent = service.send({ to: '+15557654321', body: 'The newer message.' });
      http
        .expectOne('/api/messages')
        .flush('Internal Server Error', { status: 500, statusText: 'Internal Server Error' });

      expect(await sent).toEqual({ outcome: 'error' });
    });
  });
});
