/**
 * Word Chain wire protocol, version 2 (zod mirror of the backend's pydantic
 * models). `v2.schema.json` is a copy of the backend's exported JSON Schema;
 * `schema.test.ts` fails if this file drifts from it. Refresh the copy with
 * `npm run protocol:sync`.
 */
import * as z from 'zod';

export const PROTOCOL_VERSION = 2;

export const MIN_GAME_MINUTES = 1;
export const MAX_GAME_MINUTES = 30;
export const MAX_NAME_LENGTH = 20;
export const MAX_WORD_LENGTH = 40;
export const MAX_REQUEST_ID_LENGTH = 64;

export const PlayerStatus = z.enum(['waiting', 'ready', 'playing', 'offline']);
export const GameStatus = z.enum(['lobby', 'playing', 'finished']);
export const PlayerColor = z.enum([
  'red', 'blue', 'green', 'yellow', 'purple', 'orange', 'pink', 'brown',
]);
export const ErrorCode = z.enum([
  'INEXISTENT_SESSION',
  'INEXISTENT_PLAYER',
  'ALL_PLAYERS_NEED_READY',
  'INVALID_TURN',
  'INEXISTENT_WORD',
  'WORD_ALREADY_IN_GAME',
  'NO_POINTS',
  'GAME_STARTED',
  'NOT_HOST',
  'ROOM_FULL',
  'GAME_NOT_STARTED',
  'GAME_FINISHED',
  'DEADLINE_NOT_REACHED',
  'INVALID_MESSAGE',
  'UNSUPPORTED_VERSION',
  'CONCURRENT_UPDATE',
  'INTERNAL_ERROR',
]);

const Name = z.string().min(1).max(MAX_NAME_LENGTH);
const RequestId = z.string().min(1).max(MAX_REQUEST_ID_LENGTH);
/** Unix time in milliseconds. */
const EpochMs = z.int().min(0);

// ---------------------------------------------------------------- shared

export const GameConfig = z.object({
  time: z.int().min(MIN_GAME_MINUTES).max(MAX_GAME_MINUTES),
  repetition: z.boolean(),
});

export const Player = z.object({
  id: z.string(),
  name: z.string(),
  score: z.int(),
  status: PlayerStatus,
  color: PlayerColor.nullable(),
});

export const ChainWord = z.object({
  word: z.string(),
  /** Null for the word the server seeds the chain with. */
  playerId: z.string().nullable(),
});

export const GameState = z.object({
  name: z.string(),
  status: GameStatus,
  /** In turn order; the first one is the host. */
  players: z.array(Player),
  chain: z.array(ChainWord),
  hostId: z.string().nullable(),
  turnPlayerId: z.string().nullable(),
  config: GameConfig,
  /** When play begins (after the start countdown). */
  startedAt: EpochMs.nullable(),
  endsAt: EpochMs.nullable(),
  /** Null when there is no turn timer (single active player). */
  turnDeadline: EpochMs.nullable(),
  /** Server clock when this state was sent, to offset local timers. */
  serverTime: EpochMs,
  version: z.int().min(0),
});

// ------------------------------------------------------- client -> server

const EmptyPayload = z.object({});

function clientMessage<T extends string, P extends z.ZodType>(type: T, payload: P) {
  return z.object({
    v: z.literal(PROTOCOL_VERSION),
    requestId: RequestId,
    type: z.literal(type),
    payload,
  });
}

export const HostMessage = clientMessage('host', z.object({ playerName: Name }));
export const JoinMessage = clientMessage('join', z.object({ roomName: Name, playerName: Name }));
export const ReadyMessage = clientMessage('ready', z.object({ ready: z.boolean() }));
export const StartMessage = clientMessage('start', z.object({ config: GameConfig }));
export const WordMessage = clientMessage(
  'word', z.object({ word: z.string().min(1).max(MAX_WORD_LENGTH) }),
);
export const PassMessage = clientMessage('pass', EmptyPayload);
/** Sent when a deadline expires locally. Accepted only if it expired on the server too. */
export const TimeoutMessage = clientMessage('timeout', EmptyPayload);
export const ReconnectMessage = clientMessage(
  'reconnect', z.object({ playerId: z.string().min(1) }),
);

export const ClientMessage = z.discriminatedUnion('type', [
  HostMessage, JoinMessage, ReadyMessage, StartMessage,
  WordMessage, PassMessage, TimeoutMessage, ReconnectMessage,
]);

// ------------------------------------------------------- server -> client

/** Reply to host, join and reconnect. */
export const SessionMessage = z.object({
  v: z.literal(PROTOCOL_VERSION),
  type: z.literal('session'),
  requestId: RequestId,
  payload: z.object({
    /** The player this connection controls. */
    player: Player,
    game: GameState,
  }),
});

/** Reply to ready, start, word, pass and timeout. */
export const AckMessage = z.object({
  v: z.literal(PROTOCOL_VERSION),
  type: z.literal('ack'),
  requestId: RequestId,
  payload: z.object({
    /** Only on word. */
    points: z.int().nullable(),
    chainPoints: z.int().nullable(),
  }),
});

export const ErrorReply = z.object({
  v: z.literal(PROTOCOL_VERSION),
  type: z.literal('error'),
  /** Null when the request could not be parsed. */
  requestId: RequestId.nullable(),
  payload: z.object({
    code: ErrorCode,
    /** Human-readable, pt-BR. */
    message: z.string(),
  }),
});

/** Broadcast to every player in the room whenever the game changes. */
export const GameStateMessage = z.object({
  v: z.literal(PROTOCOL_VERSION),
  type: z.literal('game_state'),
  payload: GameState,
});

export const ServerMessage = z.discriminatedUnion('type', [
  SessionMessage, AckMessage, ErrorReply, GameStateMessage,
]);

/** Both directions in one schema, shaped like the backend's export. */
export const Protocol = z.object({ client: ClientMessage, server: ServerMessage });

export type PlayerStatus = z.infer<typeof PlayerStatus>;
export type GameStatus = z.infer<typeof GameStatus>;
export type PlayerColor = z.infer<typeof PlayerColor>;
export type ErrorCode = z.infer<typeof ErrorCode>;
export type GameConfig = z.infer<typeof GameConfig>;
export type Player = z.infer<typeof Player>;
export type ChainWord = z.infer<typeof ChainWord>;
export type GameState = z.infer<typeof GameState>;
export type ClientMessage = z.infer<typeof ClientMessage>;
export type ClientMessageType = ClientMessage['type'];
export type ServerMessage = z.infer<typeof ServerMessage>;
export type SessionMessage = z.infer<typeof SessionMessage>;
export type ErrorReply = z.infer<typeof ErrorReply>;

/** What a caller provides for a client message: the envelope is added by `envelope`. */
export type ClientRequest = {
  [M in ClientMessage as M['type']]: { type: M['type']; payload: M['payload'] };
}[ClientMessageType];

export function envelope(request: ClientRequest, requestId: string): ClientMessage {
  return { v: PROTOCOL_VERSION, requestId, ...request } as ClientMessage;
}

export type ParseResult =
  | { ok: true; message: ServerMessage }
  | { ok: false; error: string };

export function parseServerMessage(data: unknown): ParseResult {
  let raw: unknown = data;
  if (typeof data === 'string') {
    try {
      raw = JSON.parse(data);
    } catch {
      return { ok: false, error: 'not JSON' };
    }
  }
  const result = ServerMessage.safeParse(raw);
  return result.success
    ? { ok: true, message: result.data }
    : { ok: false, error: z.prettifyError(result.error) };
}
