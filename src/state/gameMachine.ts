import { assign, enqueueActions, fromCallback, setup } from 'xstate';
import {
  envelope,
  type ClientMessageType,
  type ClientRequest,
  type ErrorCode,
  type ErrorReply,
  type GameConfig,
  type GameState,
  type Player,
  type ServerMessage,
} from '@src/protocol/schema';
import type { ParentToSocket, SocketToParent } from './socketActor';

export const PLAYER_ID_KEY = 'word_chain_player_id';

/** Wait after a deadline before claiming it, to absorb clock and network skew. */
export const TIMEOUT_GRACE_MS = 300;
/** Extra wait for players who are not responsible for a deadline (see `timeoutDelay`). */
export const TIMEOUT_FALLBACK_MS = 2_000;
export const TIMEOUT_RETRY_MS = 1_000;
export const MAX_TIMEOUT_RETRIES = 5;

/** Errors that mean the server no longer knows this player or room. */
const SESSION_LOST: readonly ErrorCode[] = ['INEXISTENT_PLAYER', 'INEXISTENT_SESSION'];

export type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export interface GameInput {
  storage?: StorageLike;
  now?: () => number;
  createRequestId?: () => string;
}

export type Connection = 'connecting' | 'open' | 'reconnecting';

export interface GameError {
  code: ErrorCode;
  message: string;
  /** What the failed request was, or null when the server could not tell. */
  request: ClientMessageType | null;
}

export interface GameContext {
  connection: Connection;
  player: Player | null;
  game: GameState | null;
  /** serverTime minus the local clock when the last state arrived. */
  clockOffset: number;
  /** In-flight requests, by requestId. */
  pending: Record<string, ClientMessageType>;
  /** requestId of the `reconnect` that is rehydrating the session, if any. */
  rehydrating: string | null;
  timeoutRetries: number;
  lastError: GameError | null;
  storage: StorageLike;
  now: () => number;
  createRequestId: () => string;
}

export type UiEvent =
  | { type: 'HOST'; playerName: string }
  | { type: 'JOIN'; roomName: string; playerName: string }
  | { type: 'READY'; ready: boolean }
  | { type: 'START'; config: GameConfig }
  | { type: 'WORD'; word: string }
  | { type: 'PASS' }
  | { type: 'LEAVE' };

type InternalEvent = { type: 'timeout.rejected' };

export type GameEvent = UiEvent | SocketToParent | InternalEvent;

export type GameEmitted =
  | { type: 'notice'; code: ErrorCode; message: string }
  | { type: 'word.accepted'; points: number; chainPoints: number };

const memoryStorage = (): StorageLike => {
  const items = new Map<string, string>();
  return {
    getItem: (key) => items.get(key) ?? null,
    setItem: (key, value) => void items.set(key, value),
    removeItem: (key) => void items.delete(key),
  };
};

/**
 * 128 random bits in hex. Not crypto.randomUUID: it only exists in secure
 * contexts, so a phone opening the dev server by LAN IP over http had none.
 */
export function randomRequestId(crypto: Crypto = globalThis.crypto): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, '0')).join('');
}

const defaultRequestId = () => randomRequestId();

/** Local time translated to the server's clock. */
export function serverNow(context: Pick<GameContext, 'clockOffset' | 'now'>): number {
  return context.now() + context.clockOffset;
}

/**
 * The next deadline the server will act on, and who should claim it first:
 * the turn player for a turn, the host for the end of the match. Everyone
 * else claims it a bit later, in case that player is offline.
 */
export function nextDeadline(game: GameState, playerId: string | null) {
  if (game.status !== 'playing') return null;
  const { turnDeadline, endsAt } = game;
  if (turnDeadline !== null && (endsAt === null || turnDeadline < endsAt)) {
    return { at: turnDeadline, responsible: game.turnPlayerId === playerId };
  }
  if (endsAt !== null) return { at: endsAt, responsible: game.hostId === playerId };
  return null;
}

export function timeoutDelay(context: GameContext): number | null {
  if (!context.game) return null;
  const deadline = nextDeadline(context.game, context.player?.id ?? null);
  if (!deadline) return null;
  const wait = deadline.at - serverNow(context) + TIMEOUT_GRACE_MS
    + (deadline.responsible ? 0 : TIMEOUT_FALLBACK_MS);
  return Math.max(0, wait);
}

const forgetSession = {
  player: null,
  game: null,
  pending: {},
  rehydrating: null,
  timeoutRetries: 0,
} satisfies Partial<GameContext>;

export const gameMachine = setup({
  types: {
    context: {} as GameContext,
    events: {} as GameEvent,
    input: {} as GameInput,
    emitted: {} as GameEmitted,
  },
  actions: {
    /** Sends a request and tracks it as pending until its reply arrives. */
    sendRequest: enqueueActions(({ context, enqueue }, body: ClientRequest) => {
      const requestId = context.createRequestId();
      enqueue.assign({ pending: { ...context.pending, [requestId]: body.type } });
      enqueue.sendTo('socket', { type: 'socket.send', message: envelope(body, requestId) });
    }),
  },
  actors: {
    // Replaced by createSocketLogic(...) in the app and by a fake in tests.
    socket: fromCallback<ParentToSocket>(() => {}),
  },
  delays: {
    timeout: ({ context }) => timeoutDelay(context) ?? 0,
    timeoutRetry: TIMEOUT_RETRY_MS,
  },
  guards: {
    hasSavedPlayer: ({ context }) => context.storage.getItem(PLAYER_ID_KEY) !== null,
    inLobby: ({ context }) => context.game?.status === 'lobby',
    isPlaying: ({ context }) => context.game?.status === 'playing',
    isFinished: ({ context }) => context.game?.status === 'finished',
    canRetryTimeout: ({ context }) => context.timeoutRetries < MAX_TIMEOUT_RETRIES,
  },
}).createMachine({
  id: 'game',
  context: ({ input }) => ({
    connection: 'connecting',
    player: null,
    game: null,
    clockOffset: 0,
    pending: {},
    rehydrating: null,
    timeoutRetries: 0,
    lastError: null,
    storage: input.storage ?? memoryStorage(),
    now: input.now ?? Date.now,
    createRequestId: input.createRequestId ?? defaultRequestId,
  }),
  invoke: { id: 'socket', src: 'socket' },
  initial: 'boot',
  on: {
    'socket.open': {
      actions: enqueueActions(({ context, enqueue }) => {
        enqueue.assign({ connection: 'open' });
        const savedId = context.storage.getItem(PLAYER_ID_KEY);
        if (savedId === null) {
          enqueue.sendTo('socket', { type: 'socket.release' });
          return;
        }
        // Rehydrate before anything queued goes out: the server only knows
        // this connection once `reconnect` moves the player onto it.
        const requestId = context.createRequestId();
        enqueue.assign({
          rehydrating: requestId,
          pending: { ...context.pending, [requestId]: 'reconnect' },
        });
        enqueue.sendTo('socket', {
          type: 'socket.send',
          priority: true,
          message: envelope({ type: 'reconnect', payload: { playerId: savedId } }, requestId),
        });
      }),
    },
    'socket.closed': {
      // Replies to anything sent on the old connection are gone with it.
      actions: assign({ connection: 'reconnecting', pending: {}, rehydrating: null }),
    },
    'socket.invalid': {
      actions: ({ event }) => console.warn('Ignored server message:', event.error),
    },
    'socket.message': [
      {
        guard: ({ event }) => event.message.type === 'session',
        target: '.route',
        actions: enqueueActions(({ context, event, enqueue }) => {
          const message = event.message as Extract<ServerMessage, { type: 'session' }>;
          const { player, game } = message.payload;
          context.storage.setItem(PLAYER_ID_KEY, player.id);
          enqueue.assign({
            player,
            game,
            clockOffset: game.serverTime - context.now(),
            pending: withoutRequest(context.pending, message.requestId),
            timeoutRetries: 0,
            lastError: null,
          });
          if (message.requestId === context.rehydrating) {
            enqueue.assign({ rehydrating: null });
            enqueue.sendTo('socket', { type: 'socket.release' });
          }
        }),
      },
      {
        guard: ({ context, event }) => event.message.type === 'game_state'
          && isNewerState(context.game, event.message.payload),
        target: '.route',
        actions: assign(({ context, event }) => {
          const game = (event.message as Extract<ServerMessage, { type: 'game_state' }>).payload;
          return {
            game,
            clockOffset: game.serverTime - context.now(),
            player: refreshPlayer(context.player, game),
            timeoutRetries: game.version === context.game?.version ? context.timeoutRetries : 0,
          };
        }),
      },
      {
        guard: ({ event }) => event.message.type === 'ack',
        actions: enqueueActions(({ context, event, enqueue }) => {
          const message = event.message as Extract<ServerMessage, { type: 'ack' }>;
          enqueue.assign({ pending: withoutRequest(context.pending, message.requestId) });
          const { points, chainPoints } = message.payload;
          if (points !== null) {
            enqueue.emit({ type: 'word.accepted', points, chainPoints: chainPoints ?? 0 });
          }
        }),
      },
      {
        guard: ({ event }) => event.message.type === 'error',
        actions: enqueueActions(({ context, event, enqueue }) => {
          const message = event.message as ErrorReply;
          const { code } = message.payload;
          const request = message.requestId === null
            ? null
            : context.pending[message.requestId] ?? null;
          const isRehydrating = message.requestId !== null
            && message.requestId === context.rehydrating;
          enqueue.assign({ pending: withoutRequest(context.pending, message.requestId) });

          if (request === 'timeout') {
            // Expected races between clients; never shown to the player.
            if (code === 'DEADLINE_NOT_REACHED') enqueue.raise({ type: 'timeout.rejected' });
            return;
          }

          if (isRehydrating) {
            // Whatever went wrong, the saved session cannot be restored.
            enqueue.sendTo('socket', { type: 'socket.release' });
          }
          if (isRehydrating || (SESSION_LOST.includes(code) && request !== 'join')) {
            enqueue.assign(forgetSession);
            enqueue.raise({ type: 'LEAVE' });
          }

          enqueue.assign({ lastError: { code, message: message.payload.message, request } });
          enqueue.emit({ type: 'notice', code, message: message.payload.message });
        }),
      },
    ],
    LEAVE: {
      target: '.home',
      actions: enqueueActions(({ context, enqueue }) => {
        context.storage.removeItem(PLAYER_ID_KEY);
        enqueue.assign(forgetSession);
        enqueue.sendTo('socket', { type: 'socket.clearQueue' });
        // A fresh connection id, so the old room marks this player offline
        // and its broadcasts stop arriving.
        if (context.game !== null) enqueue.sendTo('socket', { type: 'socket.cycle' });
      }),
    },
  },
  states: {
    boot: {
      always: [
        { guard: 'hasSavedPlayer', target: 'restoring' },
        { target: 'home' },
      ],
    },
    /** Waiting for `reconnect` to bring back a saved session. */
    restoring: {},
    route: {
      always: [
        { guard: 'inLobby', target: 'lobby' },
        { guard: 'isPlaying', target: 'playing' },
        { guard: 'isFinished', target: 'ended' },
        { target: 'home' },
      ],
    },
    home: {
      on: {
        HOST: {
          guard: ({ context, event }) => event.playerName.trim() !== ''
            && !hasPending(context, 'host', 'join'),
          actions: {
            type: 'sendRequest',
            params: ({ event }) => ({ type: 'host', payload: { playerName: event.playerName.trim() } }),
          },
        },
        JOIN: {
          guard: ({ context, event }) => event.playerName.trim() !== ''
            && event.roomName.trim() !== '' && !hasPending(context, 'host', 'join'),
          actions: {
            type: 'sendRequest',
            params: ({ event }) => ({
              type: 'join',
              payload: { roomName: event.roomName.trim(), playerName: event.playerName.trim() },
            }),
          },
        },
      },
    },
    lobby: {
      on: {
        READY: {
          guard: ({ context }) => !hasPending(context, 'ready'),
          actions: {
            type: 'sendRequest',
            params: ({ event }) => ({ type: 'ready', payload: { ready: event.ready } }),
          },
        },
        START: {
          guard: ({ context }) => context.game?.hostId === context.player?.id
            && !hasPending(context, 'start'),
          actions: {
            type: 'sendRequest',
            params: ({ event }) => ({ type: 'start', payload: { config: event.config } }),
          },
        },
      },
    },
    playing: {
      initial: 'armed',
      on: {
        WORD: {
          guard: ({ context, event }) => isMyTurn(context) && event.word.trim() !== ''
            && !hasPending(context, 'word', 'pass'),
          actions: {
            type: 'sendRequest',
            params: ({ event }) => ({ type: 'word', payload: { word: event.word.trim() } }),
          },
        },
        PASS: {
          guard: ({ context }) => isMyTurn(context) && !hasPending(context, 'word', 'pass'),
          actions: { type: 'sendRequest', params: { type: 'pass', payload: {} } },
        },
      },
      states: {
        /** Waits for the next server deadline, then claims it with `timeout`. */
        armed: {
          always: { guard: ({ context }) => timeoutDelay(context) === null, target: 'idle' },
          after: {
            timeout: {
              target: 'claimed',
              actions: { type: 'sendRequest', params: { type: 'timeout', payload: {} } },
            },
          },
        },
        claimed: {
          on: {
            'timeout.rejected': [
              {
                guard: 'canRetryTimeout',
                target: 'retrying',
                actions: assign({ timeoutRetries: ({ context }) => context.timeoutRetries + 1 }),
              },
              { target: 'idle' },
            ],
          },
        },
        retrying: {
          after: { timeoutRetry: { target: 'armed', reenter: true } },
        },
        idle: {},
      },
    },
    ended: {},
  },
});

function withoutRequest(pending: GameContext['pending'], requestId: string | null) {
  if (requestId === null || !(requestId in pending)) return pending;
  const rest = { ...pending };
  delete rest[requestId];
  return rest;
}

function hasPending(context: GameContext, ...types: ClientMessageType[]) {
  return Object.values(context.pending).some((type) => types.includes(type));
}

/**
 * Broadcasts from parallel Lambda invocations can arrive out of order, so
 * an older version of the same room never replaces a newer one.
 */
function isNewerState(current: GameState | null, next: GameState) {
  if (current === null) return false;
  return next.name !== current.name ? false : next.version >= current.version;
}

function refreshPlayer(player: Player | null, game: GameState) {
  if (player === null) return null;
  return game.players.find((p) => p.id === player.id) ?? player;
}

export function isMyTurn(context: Pick<GameContext, 'game' | 'player'>) {
  return context.game !== null && context.player !== null
    && context.game.turnPlayerId === context.player.id;
}
