import { describe, expect, it } from 'vitest';
import { clock, isHost, isPending, turnPlayer } from './selectors';
import { gameState, player } from './testing';

const host = player({ id: 'h' });
const guest = player({ id: 'g', name: 'Bia' });

describe('selectors', () => {
  it('knows the host and the turn player', () => {
    const game = gameState({ players: [host, guest], hostId: 'h', turnPlayerId: 'g' });

    expect(isHost({ game, player: host })).toBe(true);
    expect(isHost({ game, player: guest })).toBe(false);
    expect(isHost({ game: null, player: null })).toBe(false);
    expect(turnPlayer({ game })?.name).toBe('Bia');
  });

  it('checks pending requests by type', () => {
    expect(isPending({ pending: { r1: 'word' } }, 'word', 'pass')).toBe(true);
    expect(isPending({ pending: { r1: 'ready' } }, 'start')).toBe(false);
  });

  it('derives remaining times from server deadlines and the clock offset', () => {
    const game = gameState({
      status: 'playing', startedAt: 10_000, endsAt: 190_000, turnDeadline: 25_000,
    });

    // Local 6s is server 8s: 2s to start.
    expect(clock({ game, clockOffset: 2_000 }, 6_000)).toEqual({
      startsInMs: 2_000, matchMs: 182_000, turnMs: 17_000,
    });
    expect(clock({ game, clockOffset: 0 }, 500_000)).toEqual({
      startsInMs: 0, matchMs: 0, turnMs: 0,
    });
    expect(clock({ game: gameState(), clockOffset: 0 }, 0)).toEqual({
      startsInMs: 0, matchMs: null, turnMs: null,
    });
  });
});
