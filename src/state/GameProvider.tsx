import { useEffect, useMemo, type ReactNode } from 'react';
import { resolveWsUrl } from '@src/lib/env';
import { useEventSystem } from '@src/hooks/useEventSystem';
import { GameActor } from './context';
import { gameMachine, type StorageLike } from './gameMachine';
import { createSocketLogic } from './socketActor';

/** localStorage can throw (private mode, blocked site data); fall back to memory. */
function browserStorage(): StorageLike | undefined {
  try {
    const probe = '__word_chain_probe__';
    window.localStorage.setItem(probe, probe);
    window.localStorage.removeItem(probe);
    return window.localStorage;
  } catch {
    return undefined;
  }
}

function Notices() {
  const actor = GameActor.useActorRef();
  const { emit } = useEventSystem();

  useEffect(() => {
    const subscription = actor.on('notice', (event) => emit('infoToast', event.message));
    return () => subscription.unsubscribe();
  }, [actor, emit]);

  return null;
}

export function GameProvider({ children }: { children: ReactNode }) {
  const logic = useMemo(() => gameMachine.provide({
    actors: { socket: createSocketLogic({ url: resolveWsUrl(import.meta.env) }) },
  }), []);
  const options = useMemo(() => ({ input: { storage: browserStorage() } }), []);

  return (
    <GameActor.Provider logic={logic} options={options}>
      <Notices />
      {children}
    </GameActor.Provider>
  );
}
