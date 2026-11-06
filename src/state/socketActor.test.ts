import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { assign, createActor, sendTo, setup, type AnyEventObject } from 'xstate';
import { envelope, type ClientMessage } from '@src/protocol/schema';
import { backoffDelay, createSocketLogic, type ParentToSocket, type SocketOptions } from './socketActor';
import { FakeSocket } from './testing';

const word = (w: string, id = w): ClientMessage => envelope({ type: 'word', payload: { word: w } }, id);

/** Runs the socket logic under a parent that records what it sends back. */
function start(options: Partial<SocketOptions> = {}) {
  const parent = setup({
    types: {
      context: {} as { events: AnyEventObject[] },
      events: {} as { type: 'command'; command: ParentToSocket } | AnyEventObject,
    },
    actors: {
      socket: createSocketLogic({
        url: 'ws://test',
        createSocket: (url) => new FakeSocket(url),
        random: () => 0.5,
        ...options,
      }),
    },
  }).createMachine({
    context: { events: [] },
    invoke: { id: 'socket', src: 'socket' },
    on: {
      command: { actions: sendTo('socket', ({ event }) => (event as { command: ParentToSocket }).command) },
      '*': { actions: assign({ events: ({ context, event }) => [...context.events, event] }) },
    },
  });

  const actor = createActor(parent).start();
  return {
    actor,
    command: (command: ParentToSocket) => actor.send({ type: 'command', command }),
    events: () => actor.getSnapshot().context.events,
    types: () => actor.getSnapshot().context.events.map((e) => e.type),
  };
}

beforeEach(() => {
  FakeSocket.instances = [];
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('backoffDelay', () => {
  it('doubles up to the cap with equal jitter', () => {
    expect(backoffDelay(0, () => 0)).toBe(250);
    expect(backoffDelay(0, () => 1)).toBe(500);
    expect(backoffDelay(3, () => 0)).toBe(2_000);
    expect(backoffDelay(3, () => 1)).toBe(4_000);
    expect(backoffDelay(20, () => 1)).toBe(10_000);
    expect(backoffDelay(20, () => 0)).toBe(5_000);
  });
});

describe('socketActor', () => {
  it('connects on start and reports open', () => {
    const { types } = start();

    expect(FakeSocket.latest().url).toBe('ws://test');
    FakeSocket.latest().open();

    expect(types()).toEqual(['socket.open']);
  });

  it('holds sends after a new connection until released', () => {
    const { command } = start();
    FakeSocket.latest().open();

    command({ type: 'socket.send', message: word('sapo') });
    expect(FakeSocket.latest().sent).toEqual([]);

    command({ type: 'socket.release' });
    expect(FakeSocket.latest().sent).toEqual([word('sapo')]);

    command({ type: 'socket.send', message: word('pote') });
    expect(FakeSocket.latest().sent).toEqual([word('sapo'), word('pote')]);
  });

  it('queues while offline and flushes in order after release', () => {
    const { command } = start();
    command({ type: 'socket.send', message: word('a') });
    command({ type: 'socket.send', message: word('b') });

    FakeSocket.latest().open();
    expect(FakeSocket.latest().sent).toEqual([]);
    command({ type: 'socket.release' });

    expect(FakeSocket.latest().sent).toEqual([word('a'), word('b')]);
  });

  it('sends priority messages through the hold and drops them when offline', () => {
    const { command } = start();
    const reconnect = envelope({ type: 'reconnect', payload: { playerId: 'p1' } }, 'r');

    command({ type: 'socket.send', message: reconnect, priority: true });
    FakeSocket.latest().open();
    command({ type: 'socket.send', message: word('a') });
    command({ type: 'socket.send', message: reconnect, priority: true });

    expect(FakeSocket.latest().sent).toEqual([reconnect]);
  });

  it('caps the offline queue, dropping the oldest', () => {
    const { command } = start({ maxQueue: 2 });
    for (const w of ['a', 'b', 'c']) command({ type: 'socket.send', message: word(w) });

    FakeSocket.latest().open();
    command({ type: 'socket.release' });

    expect(FakeSocket.latest().sent).toEqual([word('b'), word('c')]);
  });

  it('clears the queue on request', () => {
    const { command } = start();
    command({ type: 'socket.send', message: word('a') });
    command({ type: 'socket.clearQueue' });

    FakeSocket.latest().open();
    command({ type: 'socket.release' });

    expect(FakeSocket.latest().sent).toEqual([]);
  });

  it('reconnects with growing backoff and resets it after a successful open', () => {
    const { events } = start();

    FakeSocket.latest().drop();
    expect(events().at(-1)).toEqual({ type: 'socket.closed', attempt: 0, retryInMs: 375 });
    vi.advanceTimersByTime(374);
    expect(FakeSocket.instances).toHaveLength(1);
    vi.advanceTimersByTime(1);
    expect(FakeSocket.instances).toHaveLength(2);

    FakeSocket.latest().drop();
    expect(events().at(-1)).toEqual({ type: 'socket.closed', attempt: 1, retryInMs: 750 });
    vi.advanceTimersByTime(750);

    FakeSocket.latest().open();
    FakeSocket.latest().drop();
    expect(events().at(-1)).toEqual({ type: 'socket.closed', attempt: 0, retryInMs: 375 });
  });

  it('holds again after reconnecting, so the parent can rehydrate first', () => {
    const { command } = start();
    FakeSocket.latest().open();
    command({ type: 'socket.release' });

    FakeSocket.latest().drop();
    vi.advanceTimersByTime(375);
    FakeSocket.latest().open();
    command({ type: 'socket.send', message: word('a') });

    expect(FakeSocket.latest().sent).toEqual([]);
    command({ type: 'socket.release' });
    expect(FakeSocket.latest().sent).toEqual([word('a')]);
  });

  it('retries at once when the network comes back', () => {
    const network = new EventTarget();
    start({ network });

    FakeSocket.latest().drop();
    network.dispatchEvent(new Event('online'));

    expect(FakeSocket.instances).toHaveLength(2);
    vi.advanceTimersByTime(10_000);
    expect(FakeSocket.instances).toHaveLength(2);
  });

  it('parses server messages and reports invalid ones', () => {
    const { events } = start();
    FakeSocket.latest().open();

    FakeSocket.latest().receive({
      v: 2, type: 'ack', requestId: 'r1', payload: { points: null, chainPoints: null },
    });
    FakeSocket.latest().receive({ action: 'game_data' });

    expect(events()[1]).toEqual({
      type: 'socket.message',
      message: { v: 2, type: 'ack', requestId: 'r1', payload: { points: null, chainPoints: null } },
    });
    expect(events()[2].type).toBe('socket.invalid');
  });

  it('cycles to a fresh connection without reporting a close', () => {
    const { command, types } = start();
    const first = FakeSocket.latest();
    first.open();

    command({ type: 'socket.cycle' });

    expect(first.closed).toBe(true);
    expect(FakeSocket.instances).toHaveLength(2);
    expect(types()).toEqual(['socket.open']);
  });

  it('closes the socket and stops retrying when stopped', () => {
    const { actor } = start();
    const socket = FakeSocket.latest();
    socket.open();

    actor.stop();

    expect(socket.closed).toBe(true);
    vi.advanceTimersByTime(60_000);
    expect(FakeSocket.instances).toHaveLength(1);
  });
});
