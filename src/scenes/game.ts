import type { TileSpec, TileTone } from '@src/engine/types';
import { chainOffsets, countOverlap } from '@src/lib/overlap';
import { toBoardText } from '@src/lib/sanitize';
import type { GameState } from '@src/protocol/schema';
import type { Clock } from '@src/state/selectors';
import { playerTone } from '@src/theme/palette';
import { countdown as countdownTokens } from '@src/theme/tokens';
import { centred, clip, fieldTiles, isCompact, text } from './text';
import type { Area, Field, HudPlayer, HudTime, Scene } from './types';

/** Whole seconds left, as the board shows them. */
export interface GameTimes {
  /** Start countdown; 0 once play has begun. */
  startsIn: number;
  match: number | null;
  turn: number | null;
}

export interface PlayState {
  game: GameState;
  playerId: string | null;
  times: GameTimes;
  typed: string;
  focused: boolean;
  /** A word or pass is waiting for the server. */
  pending: boolean;
  /** The server refused the word in the field. */
  wordError: boolean;
}

export const WORD_LENGTH = 12;
/** Most chain words on the board; older ones scroll off the top. */
export const CHAIN_ROWS = 5;
/** The big countdown tile is centred here, under PARTIDA / INICIA EM. */
const COUNTDOWN_ROW = 3;
/** Length of a turn; mirrors TURN_MS in the backend (entities/session.py), which the protocol doesn't send. */
export const TURN_MS = 15_000;
/** Clocks beat once a second for their last seconds, harder for the very last. */
export const TICK_SECONDS = 10;
export const URGENT_TICK_SECONDS = 3;
const URGENT_TURN_SECONDS = 5;
const URGENT_MATCH_SECONDS = 30;

export const gameTimes = (clock: Clock): GameTimes => ({
  startsIn: Math.ceil(clock.startsInMs / 1000),
  match: clock.matchMs === null ? null : Math.ceil(clock.matchMs / 1000),
  turn: clock.turnMs === null ? null : Math.ceil(clock.turnMs / 1000),
});

/** Tile id of the word at `index` in the chain. */
export const chainWordId = (index: number) => `chain-${index}`;

/**
 * The input takes the id of the word it will become, so once the server
 * accepts it the typed tiles fly to their place in the chain.
 */
export const inputWordId = (game: GameState) => chainWordId(game.chain.length);


/**
 * Where play sits: the input on the last row the HUD leaves free (right above
 * the message and the actions), the newest chain word two rows over it, and as
 * many older words as fit under the clock and chips, up to CHAIN_ROWS.
 */
export function playRows(area: Area): { input: number; chainBottom: number; chainRows: number } {
  const span = (area.rows - 1) / 2;
  const { top, bottom } = area.clear ?? { top: -span, bottom: span };
  const chainBottom = bottom - 2;
  return { input: bottom, chainBottom, chainRows: Math.max(1, Math.min(CHAIN_ROWS, chainBottom - top + 1)) };
}

/**
 * The chain as a staircase: each word starts under the letters it shares
 * with the one before, the newest at the bottom. Older words scroll up and
 * off the top. The visible stretch is centred; when it is wider than the
 * board, the newest word keeps to the right edge and older ones are cut.
 */
export function chainTiles(
  game: GameState,
  area: Area,
  bottom = playRows(area).chainBottom,
  rows = playRows(area).chainRows,
): TileSpec[] {
  const words = game.chain.map((w) => toBoardText(w.word));
  if (words.length === 0) return [];
  const offsets = chainOffsets(words);
  const last = words.length - 1;
  const first = Math.max(0, words.length - rows);
  const visible = words.map((_, i) => i).slice(first);
  const left = Math.min(...visible.map((i) => offsets[i]));
  const right = Math.max(...visible.map((i) => offsets[i] + words[i].length));
  const colSpan = (area.cols - 1) / 2;
  const shift = right - left <= area.cols
    ? centred(right - left) - left
    : Math.max(-colSpan, colSpan - words[last].length) - offsets[last];
  return visible.flatMap((i) => {
    const word = words[i];
    const overlap = i > 0 ? countOverlap(words[i - 1], word) : 0;
    const tone = i === last ? 'amber' : 'stone';
    return text(chainWordId(i), word, bottom - (last - i), shift + offsets[i]).map((tile, k) => ({
      ...tile, tone: k < overlap ? 'emerald' as const : tone,
    }));
  });
}

/** The start countdown: 3, 2, 1, each a bigger tile in a hotter tone. */
function countdownTile(seconds: number): TileSpec {
  const n = Math.min(3, Math.max(1, seconds));
  const tone: TileTone = countdownTokens.tones[n];
  return { key: 'countdown:0', char: String(seconds), row: COUNTDOWN_ROW, col: 0, tone, span: countdownTokens.spans[n] };
}

export function gameScene(state: PlayState, area: Area): Scene {
  const { game, playerId, times, pending } = state;
  const compact = isCompact(area);
  const started = times.startsIn === 0;
  const myTurn = playerId !== null && game.turnPlayerId === playerId;
  const canPlay = myTurn && started && !pending;
  const fields: Field[] = [];
  const tiles: TileSpec[] = [];

  const matchTotal = game.config.time * 60;
  const matchLeft = started ? times.match ?? matchTotal : matchTotal;
  const clock: HudTime = {
    seconds: matchLeft,
    fraction: matchTotal > 0 ? Math.min(1, matchLeft / matchTotal) : 0,
    urgent: started && matchLeft <= URGENT_MATCH_SECONDS,
  };
  const players: HudPlayer[] = game.players.map((p) => {
    const active = started && p.id === game.turnPlayerId;
    const turn = active && times.turn !== null
      ? { seconds: times.turn, fraction: Math.min(1, (times.turn * 1000) / TURN_MS), urgent: times.turn <= URGENT_TURN_SECONDS }
      : undefined;
    return { id: p.id, name: toBoardText(p.name), tone: playerTone(p.color), score: p.score, ...(active && { active }), ...(turn && { turn }) };
  });

  if (!started) {
    tiles.push(
      ...text('countdown-title', 'PARTIDA', -4, centred(7), { tone: 'amber' }),
      ...text('countdown-label', 'INICIA EM', -3, centred(9), { tone: 'amber' }),
      countdownTile(times.startsIn),
    );
    return { tiles: clip(tiles, area), fields, hud: { clock, players, actions: [], compact } };
  }

  // Someone else's turn: the field stays, dimmed, so their accepted word still flies up from it.
  const { input: row, chainBottom, chainRows } = playRows(area);
  tiles.push(...chainTiles(game, area, chainBottom, chainRows));
  const field: Field = { id: 'word', row, col: -6, length: WORD_LENGTH, label: 'Palavra', value: myTurn ? state.typed : '' };
  const error = myTurn && state.wordError;
  tiles.push(...fieldTiles(inputWordId(game), field, myTurn && state.focused, {
    tone: error ? 'rose' : 'stone', ...(!myTurn && { disabled: true }),
  }));
  if (myTurn) fields.push(field);

  return {
    tiles: clip(tiles, area),
    fields,
    hud: {
      clock,
      players,
      actions: [
        { id: 'pass', label: 'PASSAR', tone: 'rose', disabled: !canPlay },
        { id: 'submit', label: 'ENVIAR', glyph: '↵', tone: 'emerald', primary: true, disabled: !canPlay || state.typed === '' },
      ],
      compact,
    },
  };
}
