import type { SnapshotFrom } from 'xstate';
import type { ClientMessageType } from '@src/protocol/schema';
import { gameMachine, serverNow, type GameContext } from './gameMachine';

export { isMyTurn } from './gameMachine';

export type Screen = 'loading' | 'home' | 'lobby' | 'game' | 'end';

export function screenOf(snapshot: SnapshotFrom<typeof gameMachine>): Screen {
  if (snapshot.matches('lobby')) return 'lobby';
  if (snapshot.matches('playing')) return 'game';
  if (snapshot.matches('ended')) return 'end';
  if (snapshot.matches('home')) return 'home';
  return 'loading';
}

export function isHost(context: Pick<GameContext, 'game' | 'player'>) {
  return context.player !== null && context.game?.hostId === context.player.id;
}

export function turnPlayer(context: Pick<GameContext, 'game'>) {
  const game = context.game;
  return game?.players.find((p) => p.id === game.turnPlayerId) ?? null;
}

export function isPending(context: Pick<GameContext, 'pending'>, ...types: ClientMessageType[]) {
  return Object.values(context.pending).some((type) => types.includes(type));
}

export interface Clock {
  /** Until play begins (the start countdown); 0 once it has. */
  startsInMs: number;
  /** Left in the match, or null before it is scheduled. */
  matchMs: number | null;
  /** Left in the current turn, or null when there is no turn timer. */
  turnMs: number | null;
}

/** Remaining times derived from the server's deadlines, never counted down locally. */
export function clock(context: Pick<GameContext, 'game' | 'clockOffset'>, localNow: number): Clock {
  const now = serverNow({ clockOffset: context.clockOffset, now: () => localNow });
  const left = (at: number | null | undefined) => (at == null ? null : Math.max(0, at - now));
  const game = context.game;
  return {
    startsInMs: left(game?.startedAt) ?? 0,
    matchMs: left(game?.endsAt),
    turnMs: left(game?.turnDeadline),
  };
}
