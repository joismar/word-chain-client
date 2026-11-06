import React from 'react';
import type { Stage } from '@src/engine/Stage';
import { countOverlap } from '@src/lib/overlap';
import { toBoardText } from '@src/lib/sanitize';
import type { GameState } from '@src/protocol/schema';
import { chainWordId, inputWordId, TICK_SECONDS, URGENT_TICK_SECONDS, type GameTimes } from '@src/scenes/game';
import type { GameError } from '@src/state/gameMachine';
import type { Screen } from '@src/state/selectors';
import { playerTone } from '@src/theme/palette';

interface EffectState {
  screen: Screen;
  game: GameState | null;
  lastError: GameError | null;
  times: GameTimes;
}

/** Second of the countdown worth a beat, or null outside the last seconds. */
const beat = (seconds: number | null) => (seconds !== null && seconds > 0 && seconds <= TICK_SECONDS ? seconds : null);

/** Letters the newest word shares with the one before (0 for the seed word). */
function linkLetters(game: GameState): number {
  const [prev, next] = game.chain.slice(-2).map((w) => toBoardText(w.word));
  return game.chain.length > 1 ? countOverlap(prev, next) : 0;
}

/**
 * One-off motion that the tile join can't express: shake on a refused word,
 * a pulse in the colour of whoever plays next, the clock's last beats, and
 * particles where a new word links into the chain.
 */
export function useBoardEffects(stage: Stage | null, { screen, game, lastError, times }: EffectState) {
  const playing = screen === 'game' && game !== null && times.startsIn === 0;

  // The id of the word being typed, read when the refusal arrives.
  const inputId = React.useRef<string | null>(null);
  React.useEffect(() => {
    inputId.current = game ? inputWordId(game) : null;
  });
  React.useEffect(() => {
    if (lastError?.request === 'word' && inputId.current) stage?.play({ type: 'shake', word: inputId.current });
  }, [lastError, stage]);

  // Only growth seen while playing bursts: a chain that arrives whole (reconnect) doesn't.
  const chainLength = playing ? game.chain.length : null;
  const seenLength = React.useRef<number | null>(null);
  React.useEffect(() => {
    const before = seenLength.current;
    seenLength.current = chainLength;
    if (before === null || chainLength !== before + 1 || !game) return;
    const letters = linkLetters(game);
    if (letters > 0) stage?.play({ type: 'link', word: chainWordId(chainLength - 1), letters, tone: 'emerald' });
  }, [chainLength, game, stage]);

  const turnPlayer = playing ? game.players.find((p) => p.id === game.turnPlayerId) : undefined;
  const turnId = turnPlayer?.id ?? null;
  const turnTone = playerTone(turnPlayer?.color);
  React.useEffect(() => {
    if (turnId !== null) stage?.play({ type: 'pulse', tone: turnTone });
  }, [turnId, turnTone, stage]);

  const turnBeat = playing ? beat(times.turn) : null;
  React.useEffect(() => {
    if (turnBeat !== null) stage?.play({ type: 'tick', word: 'turn', urgent: turnBeat <= URGENT_TICK_SECONDS });
  }, [turnBeat, stage]);

  const matchBeat = playing ? beat(times.match) : null;
  React.useEffect(() => {
    if (matchBeat !== null) stage?.play({ type: 'tick', word: 'match', urgent: matchBeat <= URGENT_TICK_SECONDS });
  }, [matchBeat, stage]);
}
