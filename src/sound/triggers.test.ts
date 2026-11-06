import { describe, expect, it } from 'vitest';
import type { GameState } from '@src/protocol/schema';
import type { GameTimes } from '@src/scenes/game';
import type { GameError } from '@src/state/gameMachine';
import type { Screen } from '@src/state/selectors';
import { gameState, player } from '@src/state/testing';
import { actionCue, soundCues, typingCue, type SoundFrame } from './triggers';

const ana = player({ id: 'p1', name: 'Ana', color: 'red' });
const bia = player({ id: 'p2', name: 'Bia', color: 'blue' });
const chain = (...words: string[]) => words.map((word, i) => ({ word, playerId: i ? 'p1' : null }));

/** Ana's view of a two-player match in play, her turn, 12 s left. */
function frame(o: {
  screen?: Screen; playerId?: string; game?: Partial<GameState>; times?: Partial<GameTimes>; lastError?: GameError | null;
} = {}): SoundFrame {
  return {
    screen: o.screen ?? 'game',
    playerId: o.playerId ?? 'p1',
    game: gameState({ status: 'playing', players: [ana, bia], chain: chain('casa'), turnPlayerId: 'p1', ...o.game }),
    times: { startsIn: 0, match: 100, turn: 12, ...o.times },
    lastError: o.lastError ?? null,
  };
}
const types = (cues: { type: string }[]) => cues.map((c) => c.type);

describe('soundCues', () => {
  it('says nothing on the first frame', () => {
    expect(soundCues(null, frame())).toEqual([]);
  });

  it('counts down and starts', () => {
    expect(soundCues(frame({ times: { startsIn: 3 } }), frame({ times: { startsIn: 2 } }))).toEqual([{ type: 'count' }]);
    expect(soundCues(frame({ times: { startsIn: 1 } }), frame({ times: { startsIn: 0 } }))).toEqual([
      { type: 'go' },
      { type: 'turn', mine: true, color: 0 },
    ]);
  });

  it('links a new word with its overlap', () => {
    const next = frame({ game: { chain: chain('casa', 'sapo'), turnPlayerId: 'p2' } });
    expect(soundCues(frame(), next)).toEqual([
      { type: 'link', letters: 2 },
      { type: 'turn', mine: false, color: 1 },
    ]);
  });

  it('stays quiet when the chain jumps (reconnect)', () => {
    const jump = frame({ game: { chain: chain('casa', 'sapo', 'polo'), turnPlayerId: 'p2' } });
    expect(types(soundCues(frame(), jump))).toEqual(['turn']);
    const fromLobby = frame({ screen: 'lobby', game: { status: 'lobby' } });
    expect(types(soundCues(fromLobby, frame({ game: { chain: chain('casa', 'sapo') } })))).not.toContain('link');
  });

  it('refuses only word errors, once', () => {
    const error: GameError = { code: 'INEXISTENT_WORD', message: 'Palavra não existe', request: 'word' };
    const refused = frame({ lastError: error });
    expect(soundCues(frame(), refused)).toEqual([{ type: 'refuse' }]);
    expect(soundCues(refused, frame({ lastError: error }))).toEqual([]);
    expect(soundCues(frame(), frame({ lastError: { ...error, request: 'join' } }))).toEqual([]);
  });

  it('tells a pass from a timeout', () => {
    const next = frame({ game: { turnPlayerId: 'p2' }, times: { turn: 15 } });
    expect(soundCues(frame({ times: { turn: 6 } }), next)).toEqual([{ type: 'turn', mine: false, color: 1 }, { type: 'pass' }]);
    expect(soundCues(frame({ times: { turn: 0 } }), next)).toEqual([{ type: 'turn', mine: false, color: 1 }, { type: 'timeout' }]);
  });

  it('ticks my turn and the match, urgent at the end', () => {
    expect(soundCues(frame({ times: { turn: 4 } }), frame({ times: { turn: 3 } })))
      .toEqual([{ type: 'tick', clock: 'turn', urgent: true }]);
    const theirs = { game: { turnPlayerId: 'p2' } };
    expect(soundCues(frame({ ...theirs, times: { turn: 4 } }), frame({ ...theirs, times: { turn: 3 } }))).toEqual([]);
    expect(soundCues(frame({ times: { match: 11 } }), frame({ times: { match: 10 } })))
      .toEqual([{ type: 'tick', clock: 'match', urgent: false }]);
  });

  it('hears players come and go in the lobby', () => {
    const cara = player({ id: 'p3', name: 'Cara', color: 'green' });
    const lobby = (players = [ana, bia], name = 'casas') =>
      frame({ screen: 'lobby', game: { status: 'lobby', players, name, turnPlayerId: null } });
    expect(soundCues(lobby(), lobby([ana, bia, cara]))).toEqual([{ type: 'room', joined: true }]);
    expect(soundCues(lobby([ana, bia, cara]), lobby())).toEqual([{ type: 'room', joined: false }]);
    expect(soundCues(lobby(), lobby([ana, bia, cara], 'outra'))).toEqual([]);
  });

  it('ends with a win for the top score', () => {
    const scored = (a: number, b: number) => ({ players: [{ ...ana, score: a }, { ...bia, score: b }], status: 'finished' as const });
    const ended = (a: number, b: number, playerId = 'p1') => frame({ screen: 'end', playerId, game: scored(a, b) });
    expect(soundCues(frame(), ended(5, 3))).toEqual([{ type: 'end', win: true }]);
    expect(soundCues(frame({ playerId: 'p2' }), ended(5, 3, 'p2'))).toEqual([{ type: 'end', win: false }]);
    expect(soundCues(frame(), ended(4, 4))).toEqual([{ type: 'end', win: true }]);
  });
});

describe('typingCue', () => {
  it('sounds once per change, whatever its size', () => {
    expect(typingCue('', 'CASAMENTO')).toEqual({ type: 'key' });
    expect(typingCue('CASA', 'CAS')).toEqual({ type: 'delete' });
    expect(typingCue('A', 'A')).toBeNull();
  });
});

describe('actionCue', () => {
  it('maps HUD and tile actions to their sound', () => {
    expect(actionCue('copy', false)).toEqual({ type: 'copy' });
    expect(actionCue('ready', false)).toEqual({ type: 'toggle', on: true });
    expect(actionCue('ready', true)).toEqual({ type: 'toggle', on: false });
    expect(actionCue('pass', false)).toEqual({ type: 'press' });
  });

  it('keeps opening and closing the drawer silent', () => {
    expect(actionCue('settings', false)).toBeNull();
    expect(actionCue('close-settings', false)).toBeNull();
  });
});
