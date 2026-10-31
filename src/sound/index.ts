import { useSyncExternalStore } from 'react';
import type { StorageLike } from '@src/state/gameMachine';
import { createMixer } from './mixer';

export type { Cue } from './cues';
export { DEFAULT_SOUND, type SoundSettings, type VolumeLevel } from './mixer';

type SoundWindow = Window & { __soundLog?: string[] };

// In dev, every cue that actually plays is logged for the e2e (like __boardTiles).
const log: string[] | null = import.meta.env.DEV ? ((window as SoundWindow).__soundLog = []) : null;

function browserStorage(): StorageLike | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/** The page's sound: one mixer for the whole app. */
export const sound = createMixer({
  createContext: () => new AudioContext(),
  storage: browserStorage(),
  isHidden: () => document.hidden,
  onPlay: log ? (cue) => log.push(cue.type) : undefined,
});

/** Unlocks (or resumes, after an iOS interruption) the audio on every gesture. */
export function installSoundUnlock(target: Window = window): void {
  const unlock = () => sound.unlock();
  target.addEventListener('pointerdown', unlock, { capture: true });
  target.addEventListener('keydown', unlock, { capture: true });
}

export function useSoundSettings() {
  return useSyncExternalStore(sound.subscribe, sound.settings);
}
