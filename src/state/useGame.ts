import { useEffect, useState } from 'react';
import type { ClientMessageType, GameConfig } from '@src/protocol/schema';
import { GameActor } from './context';
import { clock, isHost, isMyTurn, isPending, screenOf, turnPlayer } from './selectors';

/** Game state and commands for the screens. */
export function useGame() {
  const actor = GameActor.useActorRef();
  const context = GameActor.useSelector((snapshot) => snapshot.context);
  const screen = GameActor.useSelector(screenOf);

  return {
    screen,
    connection: context.connection,
    game: context.game,
    player: context.player,
    lastError: context.lastError,
    isHost: isHost(context),
    isMyTurn: isMyTurn(context),
    turnPlayer: turnPlayer(context),
    isPending: (...types: ClientMessageType[]) => isPending(context, ...types),
    clock: (localNow: number) => clock(context, localNow),
    host: (playerName: string) => actor.send({ type: 'HOST', playerName }),
    join: (roomName: string, playerName: string) => actor.send({ type: 'JOIN', roomName, playerName }),
    setReady: (ready: boolean) => actor.send({ type: 'READY', ready }),
    start: (config: GameConfig) => actor.send({ type: 'START', config }),
    playWord: (word: string) => actor.send({ type: 'WORD', word }),
    pass: () => actor.send({ type: 'PASS' }),
    leave: () => actor.send({ type: 'LEAVE' }),
  };
}

/** Re-renders every `intervalMs` with the current local time, for countdown displays. */
export function useNow(intervalMs = 250) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}
