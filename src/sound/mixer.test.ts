import { describe, expect, it, vi } from 'vitest';
import type { StorageLike } from '@src/state/gameMachine';
import type { Cue } from './cues';
import { createMixer, DEFAULT_SOUND, SOUND_STORAGE_KEY, type MixerDeps } from './mixer';
import { fakeAudioContext } from './testing';

function memoryStorage(initial: Record<string, string> = {}): StorageLike & { items: Map<string, string> } {
  const items = new Map(Object.entries(initial));
  return {
    items,
    getItem: (key) => items.get(key) ?? null,
    setItem: (key, value) => void items.set(key, value),
    removeItem: (key) => void items.delete(key),
  };
}

function setup(deps: Partial<MixerDeps> = {}) {
  const fake = fakeAudioContext();
  const render = vi.fn();
  const onPlay = vi.fn();
  const createContext = vi.fn(() => fake.ctx);
  const storage = memoryStorage();
  const mixer = createMixer({ createContext, storage, render, onPlay, ...deps });
  return { mixer, render, onPlay, createContext, storage, ...fake };
}

const press: Cue = { type: 'press' };
/** The master gain the mixer last rendered into. */
const master = (render: ReturnType<typeof vi.fn>) => render.mock.calls.at(-1)![1] as GainNode;

describe('createMixer', () => {
  it('stays silent before the first gesture', () => {
    const { mixer, render } = setup();
    mixer.play(press);
    expect(render).not.toHaveBeenCalled();
  });

  it('plays after unlock and reports the cue', () => {
    const { mixer, render, onPlay } = setup();
    mixer.unlock();
    mixer.play(press);
    expect(render).toHaveBeenCalledTimes(1);
    expect(onPlay).toHaveBeenCalledWith(press);
  });

  it('creates one context and resumes it when suspended', () => {
    const { mixer, createContext, ctx, log } = setup();
    mixer.unlock();
    mixer.unlock();
    expect(createContext).toHaveBeenCalledTimes(1);
    (ctx as { state: string }).state = 'suspended';
    mixer.unlock();
    expect(log.resumes).toBe(1);
  });

  it('skips cues while the context is suspended instead of bursting them later', () => {
    const { mixer, render, ctx } = setup();
    mixer.unlock();
    (ctx as { state: string }).state = 'suspended';
    mixer.play({ type: 'tick', clock: 'turn', urgent: false });
    expect(render).not.toHaveBeenCalled();
  });

  it('resumes a context iOS interrupted (phone call, Siri)', () => {
    const { mixer, ctx, log } = setup();
    mixer.unlock();
    (ctx as { state: string }).state = 'interrupted';
    mixer.unlock();
    expect(log.resumes).toBe(1);
  });

  it('keeps the cue of the unlocking gesture while the context starts, but not later ones', () => {
    const deferred: (() => void)[] = [];
    const { mixer, render, ctx } = setup({ defer: (fn) => void deferred.push(fn) });
    // A real context reports 'running' only in a later task, never within the gesture.
    Object.assign(ctx, { state: 'suspended', resume: () => Promise.resolve() });
    mixer.unlock();
    mixer.play({ type: 'key' });
    expect(render).toHaveBeenCalledTimes(1);
    deferred.forEach((fn) => fn());
    mixer.play({ type: 'key' });
    expect(render).toHaveBeenCalledTimes(1);
  });

  it('starts on, at medium volume', () => {
    const { mixer, render } = setup();
    expect(mixer.settings()).toEqual({ enabled: true, volume: 'medium' });
    mixer.unlock();
    mixer.play(press);
    expect(master(render).gain.value).toBe(0.7);
  });

  it('follows volume changes on the master', () => {
    const { mixer, render } = setup();
    mixer.unlock();
    mixer.update({ volume: 'high' });
    mixer.play(press);
    expect(master(render).gain.value).toBe(1);
  });

  it('goes quiet when disabled and remembers it', () => {
    const { mixer, render, storage, createContext } = setup();
    mixer.unlock();
    mixer.update({ enabled: false });
    mixer.play(press);
    expect(render).not.toHaveBeenCalled();
    expect(storage.items.get(SOUND_STORAGE_KEY)).toBe('{"enabled":false,"volume":"medium"}');
    const again = createMixer({ createContext, storage, render: vi.fn() });
    expect(again.settings().enabled).toBe(false);
  });

  it('falls back to defaults on corrupt or blocked storage', () => {
    const corrupt = setup({ storage: memoryStorage({ [SOUND_STORAGE_KEY]: '{oops' }) });
    expect(corrupt.mixer.settings()).toEqual(DEFAULT_SOUND);
    const odd = setup({ storage: memoryStorage({ [SOUND_STORAGE_KEY]: '{"enabled":"yes","volume":"loud"}' }) });
    expect(odd.mixer.settings()).toEqual(DEFAULT_SOUND);
    const blocked: StorageLike = {
      getItem: () => { throw new Error('denied'); },
      setItem: () => { throw new Error('denied'); },
      removeItem: () => {},
    };
    const { mixer } = setup({ storage: blocked });
    expect(mixer.settings()).toEqual(DEFAULT_SOUND);
    expect(() => mixer.update({ enabled: false })).not.toThrow();
    expect(mixer.settings().enabled).toBe(false);
  });

  it('survives a browser without Web Audio', () => {
    const { mixer, render } = setup({ createContext: () => { throw new ReferenceError('AudioContext is not defined'); } });
    expect(() => mixer.unlock()).not.toThrow();
    expect(() => mixer.play(press)).not.toThrow();
    expect(render).not.toHaveBeenCalled();
  });

  it('only announces my turn while hidden', () => {
    const { mixer, render } = setup({ isHidden: () => true });
    mixer.unlock();
    mixer.play({ type: 'tick', clock: 'match', urgent: true });
    mixer.play({ type: 'turn', mine: false, color: 1 });
    expect(render).not.toHaveBeenCalled();
    mixer.play({ type: 'turn', mine: true, color: 0 });
    expect(render).toHaveBeenCalledTimes(1);
  });

  it('keeps the same settings object until it changes, and tells subscribers', () => {
    const { mixer } = setup();
    const listener = vi.fn();
    const unsubscribe = mixer.subscribe(listener);
    const before = mixer.settings();
    expect(mixer.settings()).toBe(before);
    mixer.update({ volume: 'low' });
    expect(mixer.settings()).not.toBe(before);
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
    mixer.update({ volume: 'high' });
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
