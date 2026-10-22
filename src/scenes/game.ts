import type { TileSpec } from '@src/engine/types';
import { chainOffsets, countOverlap } from '@src/lib/overlap';
import { toBoardText } from '@src/lib/sanitize';
import type { GameState } from '@src/protocol/schema';
import type { Clock } from '@src/state/selectors';
import { playerTone } from '@src/theme/palette';
import { centred, clip, fieldTiles, text } from './text';
import type { Area, Field, Scene } from './types';

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
}

export const WORD_LENGTH = 12;
const HEADER_ROW = -6;
/** The newest word sits here; older ones climb, one row each. */
const CHAIN_BOTTOM = 1;
export const CHAIN_ROWS = 6;
const INPUT_ROW = 3;
const BUTTON_ROW = 5;
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

const clockText = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

/**
 * The chain as a staircase: each word starts under the letters it shares
 * with the one before, the newest at the bottom. Older words scroll up and
 * off the top. The visible stretch is centred; when it is wider than the
 * board, the newest word keeps to the right edge and older ones are cut.
 */
export function chainTiles(game: GameState, area: Area): TileSpec[] {
  const words = game.chain.map((w) => toBoardText(w.word));
  if (words.length === 0) return [];
  const offsets = chainOffsets(words);
  const last = words.length - 1;
  const first = Math.max(0, words.length - CHAIN_ROWS);
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
    return text(chainWordId(i), word, CHAIN_BOTTOM - (last - i), shift + offsets[i]).map((tile, k) => ({
      ...tile, tone: k < overlap ? 'emerald' as const : tone,
    }));
  });
}

export function gameScene(state: PlayState, area: Area): Scene {
  const { game, playerId, times, pending } = state;
  const started = times.startsIn === 0;
  const myTurn = playerId !== null && game.turnPlayerId === playerId;
  const turnPlayer = game.players.find((p) => p.id === game.turnPlayerId);
  const canPlay = myTurn && started && !pending;
  const fields: Field[] = [];
  const tiles: TileSpec[] = [];

  if (times.match !== null) {
    tiles.push(...text('match', clockText(times.match), HEADER_ROW, -6, {
      tone: times.match <= URGENT_MATCH_SECONDS ? 'rose' : 'stone',
    }));
  }
  if (started && times.turn !== null) {
    const label = `${times.turn}S`;
    tiles.push(...text('turn', label, HEADER_ROW, 7 - label.length, {
      tone: times.turn <= URGENT_TURN_SECONDS ? 'rose' : playerTone(turnPlayer?.color),
    }));
  }

  tiles.push(...chainTiles(game, area));

  if (!started) {
    const label = `COMECA EM ${times.startsIn}`;
    tiles.push(...text('message', label, INPUT_ROW, centred(label.length), { tone: 'amber' }));
  } else if (myTurn) {
    const field: Field = { id: 'word', row: INPUT_ROW, col: -6, length: WORD_LENGTH, label: 'Palavra', value: state.typed };
    fields.push(field);
    tiles.push(
      ...fieldTiles(inputWordId(game), field, state.focused, { tone: 'amber' }),
      ...text('pass', 'PASSAR', BUTTON_ROW, -6, { tone: 'rose', ...(canPlay && { action: 'pass' }) }),
      ...text('submit', pending ? '...' : '↵', BUTTON_ROW, 5, {
        tone: 'emerald', ...(canPlay && state.typed !== '' && { action: 'submit' }),
      }),
    );
  } else {
    const label = `VEZ DE ${turnPlayer?.name ?? 'OUTRO'}`;
    const shown = toBoardText(label).slice(0, area.cols);
    tiles.push(...text('message', shown, INPUT_ROW, centred(shown.length), { tone: playerTone(turnPlayer?.color) }));
  }

  return { tiles: clip(tiles, area), fields };
}
