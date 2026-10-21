import { fromCallback } from 'xstate';
import {
  parseServerMessage,
  type ClientMessage,
  type ServerMessage,
} from '@src/protocol/schema';

/** The slice of WebSocket the actor uses, so tests can pass a fake. */
export interface SocketLike {
  readonly readyState: number;
  onopen: ((event: unknown) => void) | null;
  onclose: ((event: unknown) => void) | null;
  onerror: ((event: unknown) => void) | null;
  onmessage: ((event: { data: unknown }) => void) | null;
  send(data: string): void;
  close(): void;
}

const OPEN = 1;

export type SocketToParent =
  /** A new connection is up. Queued messages wait for `socket.release`. */
  | { type: 'socket.open' }
  | { type: 'socket.closed'; attempt: number; retryInMs: number }
  | { type: 'socket.message'; message: ServerMessage }
  | { type: 'socket.invalid'; error: string };

export type ParentToSocket =
  /**
   * Sends now when the connection is open and released, otherwise queues.
   * `priority` messages skip the queue and the hold (used for `reconnect`)
   * and are dropped when there is no connection.
   */
  | { type: 'socket.send'; message: ClientMessage; priority?: boolean }
  /** Ends the hold that follows every new connection and flushes the queue. */
  | { type: 'socket.release' }
  | { type: 'socket.clearQueue' }
  /** Drops the current connection and opens a fresh one right away. */
  | { type: 'socket.cycle' };

export interface SocketOptions {
  url: string;
  createSocket?: (url: string) => SocketLike;
  random?: () => number;
  /** Fires `online` when the network comes back, to retry without waiting. */
  network?: Pick<EventTarget, 'addEventListener' | 'removeEventListener'>;
  baseDelayMs?: number;
  maxDelayMs?: number;
  maxQueue?: number;
}

export const BASE_DELAY_MS = 500;
export const MAX_DELAY_MS = 10_000;
export const MAX_QUEUE = 50;

/** Exponential backoff with equal jitter: half fixed, half random. */
export function backoffDelay(
  attempt: number,
  random: () => number,
  baseDelayMs = BASE_DELAY_MS,
  maxDelayMs = MAX_DELAY_MS,
): number {
  const cap = Math.min(maxDelayMs, baseDelayMs * 2 ** attempt);
  return Math.round(cap / 2 + random() * (cap / 2));
}

/**
 * Callback actor owning the WebSocket. It reconnects on its own and keeps an
 * offline queue; the parent decides when a new connection may flush it, so
 * it can rehydrate the session (`reconnect`) before anything else is sent.
 */
export function createSocketLogic(options: SocketOptions) {
  const {
    url,
    createSocket = (target: string) => new WebSocket(target) as unknown as SocketLike,
    random = Math.random,
    network = typeof window === 'undefined' ? undefined : window,
    baseDelayMs = BASE_DELAY_MS,
    maxDelayMs = MAX_DELAY_MS,
    maxQueue = MAX_QUEUE,
  } = options;

  return fromCallback<ParentToSocket>(({ sendBack, receive }) => {
    const notify = (event: SocketToParent) => sendBack(event);
    let socket: SocketLike | null = null;
    let held = true;
    let attempt = 0;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let stopped = false;
    const queue: ClientMessage[] = [];

    const isOpen = () => socket !== null && socket.readyState === OPEN;

    function flush() {
      while (queue.length > 0 && isOpen() && !held) {
        socket!.send(JSON.stringify(queue.shift()));
      }
    }

    function detach(current: SocketLike) {
      current.onopen = current.onclose = current.onerror = current.onmessage = null;
    }

    function connect() {
      retryTimer = null;
      const current = createSocket(url);
      socket = current;
      held = true;

      current.onopen = () => {
        attempt = 0;
        notify({ type: 'socket.open' });
      };
      current.onmessage = (event) => {
        const result = parseServerMessage(event.data);
        notify(result.ok
          ? { type: 'socket.message', message: result.message }
          : { type: 'socket.invalid', error: result.error });
      };
      // Browsers fire close after error, so error needs no handling of its own.
      current.onerror = () => {};
      current.onclose = () => {
        detach(current);
        if (socket !== current || stopped) return;
        socket = null;
        scheduleRetry();
      };
    }

    function scheduleRetry() {
      const retryInMs = backoffDelay(attempt, random, baseDelayMs, maxDelayMs);
      notify({ type: 'socket.closed', attempt, retryInMs });
      attempt += 1;
      retryTimer = setTimeout(connect, retryInMs);
    }

    function retryNow() {
      if (retryTimer === null) return;
      clearTimeout(retryTimer);
      connect();
    }

    function drop() {
      if (retryTimer !== null) clearTimeout(retryTimer);
      retryTimer = null;
      if (socket) {
        const current = socket;
        socket = null;
        detach(current);
        current.close();
      }
    }

    receive((event) => {
      switch (event.type) {
        case 'socket.send':
          if (event.priority) {
            if (isOpen()) socket!.send(JSON.stringify(event.message));
          } else if (isOpen() && !held && queue.length === 0) {
            socket!.send(JSON.stringify(event.message));
          } else {
            queue.push(event.message);
            if (queue.length > maxQueue) queue.shift();
          }
          break;
        case 'socket.release':
          held = false;
          flush();
          break;
        case 'socket.clearQueue':
          queue.length = 0;
          break;
        case 'socket.cycle':
          drop();
          attempt = 0;
          connect();
          break;
      }
    });

    network?.addEventListener('online', retryNow);
    connect();

    return () => {
      stopped = true;
      network?.removeEventListener('online', retryNow);
      drop();
    };
  });
}
