import { describe, expect, it } from 'vitest';
import * as z from 'zod';
import backendSchema from './v2.schema.json';
import {
  ClientMessage,
  envelope,
  parseServerMessage,
  Protocol,
  type GameState,
} from './schema';

type Json = null | boolean | number | string | Json[] | { [key: string]: Json };
type JsonObject = { [key: string]: Json };

// Keys that document a schema without changing what it accepts.
const ANNOTATIONS = new Set(['$schema', 'title', 'description', 'default', 'discriminator']);

/**
 * Reduces a JSON Schema to what it accepts, so pydantic's and zod's exports
 * can be compared: refs inlined, annotations dropped, unions sorted, and
 * zod's safe-integer bounds removed.
 */
function canonical(node: Json, defs: JsonObject): Json {
  if (Array.isArray(node)) return node.map((item) => canonical(item, defs));
  if (node === null || typeof node !== 'object') return node;

  if (typeof node.$ref === 'string') {
    const name = node.$ref.replace('#/$defs/', '');
    return canonical(defs[name], defs);
  }

  const out: JsonObject = {};
  for (const [key, value] of Object.entries(node)) {
    if (ANNOTATIONS.has(key) || key === '$defs') continue;
    if ((key === 'minimum' && value === Number.MIN_SAFE_INTEGER)
      || (key === 'maximum' && value === Number.MAX_SAFE_INTEGER)) continue;
    out[key === 'oneOf' ? 'anyOf' : key] = canonical(value, defs);
  }

  // A const already pins the type (zod says number where pydantic says integer).
  if ('const' in out) delete out.type;

  // `{type: ['string', 'null']}` and `anyOf: [{type: 'string'}, {type: 'null'}]` are the same.
  if (Array.isArray(out.type)) {
    const { type, ...rest } = out;
    out.anyOf = (type as string[]).map((t) => (t === 'null' ? { type: t } : { ...rest, type: t }));
    for (const key of Object.keys(rest)) delete out[key];
    delete out.type;
  }
  if (Array.isArray(out.anyOf)) {
    out.anyOf = [...out.anyOf].sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
  }
  if (Array.isArray(out.required)) out.required = [...out.required].sort();
  return sortKeys(out);
}

function sortKeys(node: JsonObject): JsonObject {
  return Object.fromEntries(Object.entries(node).sort(([a], [b]) => a.localeCompare(b)));
}

const fromBackend = (schema: JsonObject) => canonical(schema, schema.$defs as JsonObject);
const fromZod = (schema: z.ZodType) => {
  const json = z.toJSONSchema(schema, { reused: 'inline' }) as JsonObject;
  return canonical(json, (json.$defs ?? {}) as JsonObject);
};

const state: GameState = {
  name: 'casas',
  status: 'playing',
  players: [{ id: 'h', name: 'Ana', score: 0, status: 'playing', color: 'red' }],
  chain: [{ word: 'casas', playerId: null }],
  hostId: 'h',
  turnPlayerId: 'h',
  config: { time: 3, repetition: true },
  startedAt: 1_000,
  endsAt: 181_000,
  turnDeadline: 16_000,
  serverTime: 900,
  version: 3,
};

describe('protocol schema', () => {
  it('matches the backend JSON Schema', () => {
    expect(fromZod(Protocol)).toEqual(fromBackend(backendSchema as JsonObject));
  });

  it('wraps a request in the v2 envelope', () => {
    const message = envelope({ type: 'word', payload: { word: 'sapo' } }, 'r1');

    expect(message).toEqual({ v: 2, requestId: 'r1', type: 'word', payload: { word: 'sapo' } });
    expect(ClientMessage.safeParse(message).success).toBe(true);
  });

  it('parses server messages from JSON text', () => {
    const result = parseServerMessage(JSON.stringify({ v: 2, type: 'game_state', payload: state }));

    expect(result).toEqual({ ok: true, message: { v: 2, type: 'game_state', payload: state } });
  });

  it('parses errors with a null requestId', () => {
    const result = parseServerMessage({
      v: 2, type: 'error', requestId: null,
      payload: { code: 'INVALID_MESSAGE', message: 'Mensagem inválida.' },
    });

    expect(result.ok).toBe(true);
  });

  it('rejects malformed and unknown messages', () => {
    expect(parseServerMessage('{not json').ok).toBe(false);
    expect(parseServerMessage({ action: 'game_data', data: {} }).ok).toBe(false);
    expect(parseServerMessage({
      v: 2, type: 'error', requestId: null, payload: { code: 'NOPE', message: '' },
    }).ok).toBe(false);
  });

  it('ignores fields a newer server adds', () => {
    const result = parseServerMessage({
      v: 2, type: 'game_state', payload: { ...state, round: 2 },
    });

    expect(result).toEqual({ ok: true, message: { v: 2, type: 'game_state', payload: state } });
  });
});
