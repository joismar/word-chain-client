import { countOverlap } from '@src/lib/overlap';
import { toBoardText } from '@src/lib/sanitize';
import { PlayerColor, type GameState } from '@src/protocol/schema';
import { TICK_SECONDS, URGENT_TICK_SECONDS, type GameTimes } from '@src/scenes/game';
import type { GameError } from '@src/state/gameMachine';
import type { Screen } from '@src/state/selectors';
import type { Cue } from './cues';

/** What the sounds of the game depend on, once per render. */
export interface SoundFrame {
  screen: Screen;
  playerId: string | null;
  game: GameState | null;
  times: GameTimes;
  lastError: GameError | null;
}

/** The start countdown beats on its last seconds, like the big tile (3 · 2 · 1). */
const COUNT_SECONDS = 3;

const playing = (f: SoundFrame) => f.screen === 'game' && f.game !== null && f.times.startsIn === 0;
const beat = (seconds: number | null): seconds is number => seconds !== null && seconds >= 1 && seconds <= TICK_SECONDS;
const colorIndex = (game: GameState, id: string) => {
  const color = game.players.find((p) => p.id === id)?.color;
  return color ? PlayerColor.options.indexOf(color) : 0;
};

/** Letters the newest word shares with the one before. */
function linkLetters(game: GameState): number {
  const [prev, next] = game.chain.slice(-2).map((w) => toBoardText(w.word));
  return countOverlap(prev, next);
}

/**
 * The cues between two consecutive frames. Like useBoardEffects, only what
 * changed while playing sounds: the first frame and a chain that arrives
 * whole (reconnect) stay quiet.
 */
export function soundCues(prev: SoundFrame | null, next: SoundFrame): Cue[] {
  if (!prev) return [];
  const cues: Cue[] = [];
  const was = playing(prev) ? prev.game! : null;
  const now = playing(next) ? next.game! : null;
  const { startsIn } = next.times;

  if (next.screen === 'game' && startsIn !== prev.times.startsIn) {
    if (startsIn >= 1 && startsIn <= COUNT_SECONDS) cues.push({ type: 'count' });
    else if (startsIn === 0 && prev.times.startsIn > 0) cues.push({ type: 'go' });
  }

  const grew = was && now && now.chain.length === was.chain.length + 1;
  if (grew) cues.push({ type: 'link', letters: linkLetters(now) });

  if (next.lastError !== prev.lastError && next.lastError?.request === 'word') cues.push({ type: 'refuse' });

  const turnId = now?.turnPlayerId ?? null;
  if (now && turnId !== null && turnId !== (was?.turnPlayerId ?? null)) {
    cues.push({ type: 'turn', mine: turnId === next.playerId, color: colorIndex(now, turnId) });
    if (was?.turnPlayerId && was.chain.length === now.chain.length) {
      cues.push({ type: prev.times.turn === 0 ? 'timeout' : 'pass' });
    }
  }

  if (now && turnId === next.playerId && next.times.turn !== prev.times.turn && beat(next.times.turn)) {
    cues.push({ type: 'tick', clock: 'turn', urgent: next.times.turn <= URGENT_TICK_SECONDS });
  }
  if (now && next.times.match !== prev.times.match && beat(next.times.match)) {
    cues.push({ type: 'tick', clock: 'match', urgent: next.times.match <= URGENT_TICK_SECONDS });
  }

  if (prev.screen === 'lobby' && next.screen === 'lobby' && prev.game && next.game && prev.game.name === next.game.name) {
    const change = next.game.players.length - prev.game.players.length;
    if (Math.abs(change) === 1) cues.push({ type: 'room', joined: change > 0 });
  }

  if (prev.screen === 'game' && next.screen === 'end' && next.game) {
    const top = Math.max(...next.game.players.map((p) => p.score));
    const me = next.game.players.find((p) => p.id === next.playerId);
    cues.push({ type: 'end', win: me !== undefined && me.score === top });
  }

  return cues;
}

/** One sound per change of a field, however many letters it took (paste, autofill). */
export function typingCue(before: string, after: string): Cue | null {
  if (after.length > before.length) return { type: 'key' };
  if (after.length < before.length) return { type: 'delete' };
  return null;
}

/** Opening and closing the drawer is decoration: no sound (docs/sound-plan.md). */
const SILENT_ACTIONS = new Set(['settings', 'close-settings']);

/** The sound of a HUD or tile action, if any; `ready` is my readiness before the tap. */
export function actionCue(action: string, ready: boolean): Cue | null {
  if (SILENT_ACTIONS.has(action)) return null;
  if (action === 'copy') return { type: 'copy' };
  if (action === 'ready') return { type: 'toggle', on: !ready };
  return { type: 'press' };
}
