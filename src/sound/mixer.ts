import type { StorageLike } from '@src/state/gameMachine';
import { planCue, type Cue } from './cues';
import { playVoices } from './synth';
import { soundTokens, type SoundTokens } from './tokens';

export type VolumeLevel = 'low' | 'medium' | 'high';

/** Per device, not per room: everyone edits their own. */
export interface SoundSettings {
  enabled: boolean;
  volume: VolumeLevel;
}

export const DEFAULT_SOUND: SoundSettings = { enabled: true, volume: 'medium' };
export const SOUND_STORAGE_KEY = 'word-chain:sound';

export interface MixerDeps {
  /** Called inside the first gesture; may throw where there is no Web Audio. */
  createContext: () => AudioContext;
  storage?: StorageLike | null;
  isHidden?: () => boolean;
  random?: () => number;
  render?: typeof playVoices;
  /** After a cue is rendered (the dev log). */
  onPlay?: (cue: Cue) => void;
  /** Runs `fn` in a later task; ends the unlocking gesture's window. */
  defer?: (fn: () => void) => void;
  tokens?: SoundTokens;
}

export interface Mixer {
  /** Creates or resumes the AudioContext; call it from every user gesture. */
  unlock(): void;
  play(cue: Cue): void;
  /** The same object until `update` changes it (for useSyncExternalStore). */
  settings(): SoundSettings;
  update(patch: Partial<SoundSettings>): void;
  subscribe(listener: () => void): () => void;
}

const VOLUMES: readonly VolumeLevel[] = ['low', 'medium', 'high'];

function load(storage: StorageLike | null): SoundSettings {
  try {
    const saved: unknown = JSON.parse(storage?.getItem(SOUND_STORAGE_KEY) ?? 'null');
    if (typeof saved !== 'object' || saved === null) return DEFAULT_SOUND;
    const { enabled, volume } = saved as Partial<Record<keyof SoundSettings, unknown>>;
    if (typeof enabled !== 'boolean' || !VOLUMES.includes(volume as VolumeLevel)) return DEFAULT_SOUND;
    return { enabled, volume: volume as VolumeLevel };
  } catch {
    return DEFAULT_SOUND;
  }
}

/**
 * The page's one AudioContext and its master gain. Nothing plays before a
 * gesture unlocks it, while it is suspended (no burst on resume) except for
 * the cues of the unlocking gesture itself, while the sound is off, or while
 * the tab is hidden, except my turn (it calls you back).
 */
export function createMixer({
  createContext, storage = null, isHidden = () => false, random = Math.random,
  render = playVoices, onPlay, defer = (fn) => setTimeout(fn, 0), tokens = soundTokens,
}: MixerDeps): Mixer {
  let settings = load(storage);
  let audio: { ctx: AudioContext; master: GainNode } | null = null;
  let unavailable = false;
  // A context reports 'running' only in a later task: until then, the gesture
  // that unlocked it may still schedule (its nodes start when it runs).
  let starting = false;
  const listeners = new Set<() => void>();

  return {
    unlock() {
      if (unavailable) return;
      try {
        if (!audio) {
          const ctx = createContext();
          const master = ctx.createGain();
          master.gain.value = tokens.volume[settings.volume];
          master.connect(ctx.destination);
          audio = { ctx, master };
        }
        // 'suspended', or iOS's 'interrupted' after a call or Siri.
        const state: string = audio.ctx.state;
        if (state !== 'running' && state !== 'closed') {
          audio.ctx.resume().catch(() => {});
          starting = true;
          defer(() => {
            starting = false;
          });
        }
      } catch {
        unavailable = true;
      }
    },

    play(cue) {
      if (!audio || !settings.enabled) return;
      if (audio.ctx.state !== 'running' && !starting) return;
      if (isHidden() && !(cue.type === 'turn' && cue.mine)) return;
      render(audio.ctx, audio.master, audio.ctx.currentTime, planCue(cue, random, tokens), tokens);
      onPlay?.(cue);
    },

    settings: () => settings,

    update(patch) {
      settings = { ...settings, ...patch };
      try {
        storage?.setItem(SOUND_STORAGE_KEY, JSON.stringify(settings));
      } catch {
        // Private mode or blocked storage: the choice lasts until the page closes.
      }
      audio?.master.gain.setTargetAtTime(tokens.volume[settings.volume], audio.ctx.currentTime, tokens.volumeRamp);
      listeners.forEach((listener) => listener());
    },

    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
