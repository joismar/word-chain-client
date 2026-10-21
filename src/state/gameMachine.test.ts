import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createActor } from 'xstate';
import type { ErrorCode, GameState, Player } from '@src/protocol/schema';
import {
  gameMachine,
  MAX_TIMEOUT_RETRIES,
  PLAYER_ID_KEY,
  TIMEOUT_FALLBACK_MS,
  TIMEOUT_GRACE_MS,
  TIMEOUT_RETRY_MS,
  type GameEmitted,
  type StorageLike,
} from './gameMachine';
import { fakeSocketLogic, gameState, player } from './testing';

const T0 = 1_700_000_000_000;

function memoryStorage(initial: Record<string, string> = {}): StorageLike & { items: Map<string, string> } {
  const items = new Map(Object.entries(initial));
  return {
    items,
    getItem: (key) => items.get(key) ?? null,
    setItem: (key, value) => void items.set(key, value),
    removeItem: (key) => void items.delete(key),
  };
}

function start(storage = memoryStorage()) {
  const { logic, harness } = fakeSocketLogic();
  let counter = 0;
  const actor = createActor(gameMachine.provide({ actors: { socket: logic } }), {
    input: { storage, now: () => Date.now(), createRequestId: () => `r${++counter}` },
  });
  const emitted: GameEmitted[] = [];
  actor.on('*', (event) => emitted.push(event));
  actor.start();

  const lastRequestId = () => harness.lastSent().requestId;
  return {
    actor,
    socket: harness,
    storage,
    emitted,
    state: () => actor.getSnapshot(),
    context: () => actor.getSnapshot().context,
    lastRequestId,
    session(me: Player, game: GameState, requestId = lastRequestId()) {
      harness.push({ v: 2, type: 'session', requestId, payload: { player: me, game } });
    },
    broadcast(game: GameState) {
      harness.push({ v: 2, type: 'game_state', payload: game });
    },
    ack(requestId = lastRequestId(), points: number | null = null, chainPoints: number | null = null) {
      harness.push({ v: 2, type: 'ack', requestId, payload: { points, chainPoints } });
    },
    error(code: ErrorCode, requestId: string | null = lastRequestId(), message = `msg ${code}`) {
      harness.push({ v: 2, type: 'error', requestId, payload: { code, message } });
    },
  };
}

const host = player({ id: 'h', name: 'Host', status: 'ready' });
const guest = player({ id: 'g', name: 'Guest', color: 'blue', status: 'ready' });

/** A match in progress where it is `turn`'s turn, timed from the server clock `now`. */
function playing(now: number, overrides: Partial<GameState> = {}): GameState {
  return gameState({
    status: 'playing',
    players: [{ ...host, status: 'playing' }, { ...guest, status: 'playing' }],
    hostId: 'h',
    turnPlayerId: 'h',
    chain: [{ word: 'casas', playerId: null }],
    startedAt: now,
    endsAt: now + 180_000,
    turnDeadline: now + 15_000,
    serverTime: now,
    version: 5,
    ...overrides,
  });
}

/** Joins as `me` into a running match. */
function inGame(me: Player, overrides: Partial<GameState> = {}) {
  const game = start();
  game.socket.open();
  game.actor.send({ type: 'JOIN', roomName: 'casas', playerName: me.name });
  game.session(me, playing(Date.now(), overrides));
  return game;
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(T0);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('connection and session', () => {
  it('boots to home and releases the socket when nothing is saved', () => {
    const game = start();
    expect(game.state().value).toBe('home');
    expect(game.context().connection).toBe('connecting');

    game.socket.open();

    expect(game.context().connection).toBe('open');
    expect(game.socket.commands).toEqual([{ type: 'socket.release' }]);
  });

  it('hosts a room and enters the lobby on the session reply', () => {
    const game = start();
    game.socket.open();

    game.actor.send({ type: 'HOST', playerName: '  Ana ' });

    expect(game.socket.lastSent()).toEqual({
      v: 2, type: 'host', requestId: 'r1', payload: { playerName: 'Ana' },
    });
    expect(game.context().pending).toEqual({ r1: 'host' });

    game.session(host, gameState({ players: [host], hostId: 'h' }));

    expect(game.state().value).toBe('lobby');
    expect(game.context().pending).toEqual({});
    expect(game.storage.getItem(PLAYER_ID_KEY)).toBe('h');
  });

  it('ignores blank names and repeated clicks while a request is in flight', () => {
    const game = start();
    game.actor.send({ type: 'HOST', playerName: '   ' });
    game.actor.send({ type: 'JOIN', roomName: 'casas', playerName: 'Bia' });
    game.actor.send({ type: 'HOST', playerName: 'Ana' });

    expect(game.socket.sent.map((m) => m.type)).toEqual(['join']);
  });

  it('stays home and shows the server message when the room does not exist', () => {
    const game = start(memoryStorage());
    game.socket.open();
    game.actor.send({ type: 'JOIN', roomName: 'nada', playerName: 'Bia' });

    game.error('INEXISTENT_SESSION', 'r1', 'Sessão não existe.');

    expect(game.state().value).toBe('home');
    expect(game.socket.commands).not.toContainEqual({ type: 'socket.clearQueue' });
    expect(game.context().lastError).toEqual({
      code: 'INEXISTENT_SESSION', message: 'Sessão não existe.', request: 'join',
    });
    expect(game.emitted).toContainEqual({
      type: 'notice', code: 'INEXISTENT_SESSION', message: 'Sessão não existe.',
    });
  });

  it('restores a saved session before releasing anything queued', () => {
    const game = start(memoryStorage({ [PLAYER_ID_KEY]: 'old-id' }));
    expect(game.state().value).toBe('restoring');

    game.socket.open();

    expect(game.socket.commands).toEqual([{
      type: 'socket.send',
      priority: true,
      message: { v: 2, type: 'reconnect', requestId: 'r1', payload: { playerId: 'old-id' } },
    }]);

    game.session({ ...guest, id: 'new-id' }, playing(Date.now(), { turnPlayerId: 'new-id' }));

    expect(game.state().matches('playing')).toBe(true);
    expect(game.socket.commands.at(-1)).toEqual({ type: 'socket.release' });
    expect(game.storage.getItem(PLAYER_ID_KEY)).toBe('new-id');
    expect(game.context().rehydrating).toBeNull();
  });

  it('forgets a saved session the server no longer has', () => {
    const game = start(memoryStorage({ [PLAYER_ID_KEY]: 'old-id' }));
    game.socket.open();

    game.error('INEXISTENT_PLAYER', 'r1');

    expect(game.state().value).toBe('home');
    expect(game.storage.getItem(PLAYER_ID_KEY)).toBeNull();
    expect(game.socket.commands.slice(1)).toEqual([
      { type: 'socket.release' },
      { type: 'socket.clearQueue' },
    ]);
  });

  it('rehydrates through reconnect after the connection drops mid-game', () => {
    const game = inGame(guest);
    game.actor.send({ type: 'PASS' });

    game.socket.closed();
    expect(game.context().connection).toBe('reconnecting');
    expect(game.context().pending).toEqual({});

    game.socket.open();
    expect(game.socket.lastSent()).toMatchObject({ type: 'reconnect', payload: { playerId: 'g' } });
    game.session({ ...guest, id: 'g2' }, playing(Date.now(), { version: 7 }));

    expect(game.context().player?.id).toBe('g2');
    expect(game.context().game?.version).toBe(7);
    expect(game.socket.commands.at(-1)).toEqual({ type: 'socket.release' });
  });

  it('leaves to home with a fresh connection', () => {
    const game = inGame(guest);

    game.actor.send({ type: 'LEAVE' });

    expect(game.state().value).toBe('home');
    expect(game.context().game).toBeNull();
    expect(game.storage.getItem(PLAYER_ID_KEY)).toBeNull();
    expect(game.socket.commands.slice(-2)).toEqual([
      { type: 'socket.clearQueue' },
      { type: 'socket.cycle' },
    ]);
  });
});

describe('game state', () => {
  it('routes by the status in each broadcast', () => {
    const game = start();
    game.socket.open();
    game.actor.send({ type: 'HOST', playerName: 'Host' });
    game.session(host, gameState({ players: [host], hostId: 'h', version: 1 }));

    game.broadcast(playing(Date.now(), { version: 2 }));
    expect(game.state().matches('playing')).toBe(true);

    game.broadcast(playing(Date.now(), { status: 'finished', version: 3 }));
    expect(game.state().value).toBe('ended');
  });

  it('ignores older versions and other rooms', () => {
    const game = inGame(guest, { version: 5 });

    game.broadcast(playing(Date.now(), { version: 4, turnPlayerId: 'g' }));
    game.broadcast(playing(Date.now(), { name: 'outra', version: 9, turnPlayerId: 'g' }));

    expect(game.context().game?.turnPlayerId).toBe('h');
  });

  it('keeps my player record in sync with the broadcast', () => {
    const game = inGame(guest);

    game.broadcast(playing(Date.now(), {
      version: 6,
      players: [{ ...host, status: 'playing' }, { ...guest, score: 7, status: 'playing' }],
    }));

    expect(game.context().player?.score).toBe(7);
  });

  it('measures the clock offset from serverTime', () => {
    const game = inGame(guest, { serverTime: Date.now() + 4_000 });
    expect(game.context().clockOffset).toBe(4_000);
  });
});

describe('lobby and turns', () => {
  function lobby(me: Player) {
    const game = start();
    game.socket.open();
    game.actor.send({ type: 'JOIN', roomName: 'casas', playerName: me.name });
    game.session(me, gameState({ players: [host, guest], hostId: 'h' }));
    return game;
  }

  it('sends ready and lets only the host start', () => {
    const asGuest = lobby(guest);
    asGuest.actor.send({ type: 'READY', ready: true });
    asGuest.actor.send({ type: 'START', config: { time: 5, repetition: false } });
    expect(asGuest.socket.sent.map((m) => m.type)).toEqual(['join', 'ready']);

    const asHost = lobby(host);
    asHost.actor.send({ type: 'START', config: { time: 5, repetition: false } });
    expect(asHost.socket.lastSent()).toMatchObject({
      type: 'start', payload: { config: { time: 5, repetition: false } },
    });
  });

  it('plays words only on my turn and reports the score', () => {
    const asGuest = inGame(guest);
    asGuest.actor.send({ type: 'WORD', word: 'sapo' });
    asGuest.actor.send({ type: 'PASS' });
    expect(asGuest.socket.sent.map((m) => m.type)).toEqual(['join']);

    const asHost = inGame(host);
    asHost.actor.send({ type: 'WORD', word: ' sapo ' });
    expect(asHost.socket.lastSent()).toMatchObject({ type: 'word', payload: { word: 'sapo' } });

    asHost.ack(asHost.lastRequestId(), 2, 1);

    expect(asHost.emitted).toContainEqual({ type: 'word.accepted', points: 2, chainPoints: 1 });
    expect(asHost.context().pending).toEqual({});
  });

  it('identifies game errors by code, not by message text', () => {
    const game = inGame(host);
    game.actor.send({ type: 'WORD', word: 'xyzw' });

    game.error('INEXISTENT_WORD', game.lastRequestId(), 'qualquer texto');

    expect(game.state().matches('playing')).toBe(true);
    expect(game.context().lastError).toMatchObject({ code: 'INEXISTENT_WORD', request: 'word' });
  });

  it('goes home when the server forgets the player mid-game', () => {
    const game = inGame(host);
    game.actor.send({ type: 'PASS' });

    game.error('INEXISTENT_PLAYER');

    expect(game.state().value).toBe('home');
    expect(game.storage.getItem(PLAYER_ID_KEY)).toBeNull();
  });

  it('shows errors the server could not tie to a request', () => {
    const game = inGame(host);

    game.error('INVALID_MESSAGE', null);

    expect(game.context().lastError).toMatchObject({ code: 'INVALID_MESSAGE', request: null });
    expect(game.emitted.at(-1)).toMatchObject({ type: 'notice', code: 'INVALID_MESSAGE' });
  });
});

describe('deadlines', () => {
  const timeouts = (game: ReturnType<typeof start>) =>
    game.socket.sent.filter((m) => m.type === 'timeout').length;

  it('claims the turn deadline as the turn player, after the grace period', () => {
    const game = inGame(host);

    vi.advanceTimersByTime(15_000 + TIMEOUT_GRACE_MS - 1);
    expect(timeouts(game)).toBe(0);
    vi.advanceTimersByTime(1);

    expect(timeouts(game)).toBe(1);
    expect(game.state().matches({ playing: 'claimed' })).toBe(true);
  });

  it('waits longer when another player is responsible for the deadline', () => {
    const game = inGame(guest);

    vi.advanceTimersByTime(15_000 + TIMEOUT_GRACE_MS);
    expect(timeouts(game)).toBe(0);
    vi.advanceTimersByTime(TIMEOUT_FALLBACK_MS);

    expect(timeouts(game)).toBe(1);
  });

  it('times deadlines on the server clock', () => {
    // The server is 4s ahead, so its deadline arrives 4s sooner locally.
    const game = inGame(host, {
      serverTime: Date.now() + 4_000,
      turnDeadline: Date.now() + 15_000,
    });

    vi.advanceTimersByTime(11_000 + TIMEOUT_GRACE_MS);

    expect(timeouts(game)).toBe(1);
  });

  it('claims the end of the match as the host when no turn timer runs', () => {
    const game = inGame(host, { turnDeadline: null, endsAt: Date.now() + 60_000 });

    vi.advanceTimersByTime(60_000 + TIMEOUT_GRACE_MS);

    expect(timeouts(game)).toBe(1);
  });

  it('re-arms on every new state', () => {
    const game = inGame(host);
    vi.advanceTimersByTime(10_000);

    game.broadcast(playing(Date.now(), { version: 6 }));
    vi.advanceTimersByTime(15_000 + TIMEOUT_GRACE_MS - 1);
    expect(timeouts(game)).toBe(0);

    vi.advanceTimersByTime(1);
    expect(timeouts(game)).toBe(1);
  });

  it('retries quietly when the server deadline has not passed yet, up to a limit', () => {
    const game = inGame(host);
    vi.advanceTimersByTime(15_000 + TIMEOUT_GRACE_MS);

    for (let retry = 1; retry <= MAX_TIMEOUT_RETRIES; retry++) {
      game.error('DEADLINE_NOT_REACHED');
      // +1: the re-armed claim is a zero delay scheduled at the boundary.
      vi.advanceTimersByTime(TIMEOUT_RETRY_MS + 1);
      expect(timeouts(game)).toBe(1 + retry);
    }
    game.error('DEADLINE_NOT_REACHED');
    vi.advanceTimersByTime(60_000);

    expect(timeouts(game)).toBe(1 + MAX_TIMEOUT_RETRIES);
    expect(game.state().matches({ playing: 'idle' })).toBe(true);
    expect(game.emitted.filter((e) => e.type === 'notice')).toEqual([]);
  });

  it('sets no timer outside a match', () => {
    const game = start();
    game.socket.open();
    game.actor.send({ type: 'HOST', playerName: 'Host' });
    game.session(host, gameState({ players: [host], hostId: 'h' }));

    vi.advanceTimersByTime(600_000);

    expect(timeouts(game)).toBe(0);
  });
});
