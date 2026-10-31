import type { Cue } from './cues';

/** One of every cue shape, for tests that sweep them all. */
export const ALL_CUES: Cue[] = [
  { type: 'press' }, { type: 'toggle', on: true }, { type: 'toggle', on: false }, { type: 'copy' },
  { type: 'room', joined: true }, { type: 'room', joined: false }, { type: 'notice' }, { type: 'count' },
  { type: 'go' }, { type: 'key' }, { type: 'delete' }, { type: 'link', letters: 3 }, { type: 'refuse' },
  { type: 'turn', mine: true, color: 7 }, { type: 'turn', mine: false, color: 0 },
  { type: 'tick', clock: 'turn', urgent: true }, { type: 'tick', clock: 'match', urgent: false },
  { type: 'pass' }, { type: 'timeout' }, { type: 'end', win: true }, { type: 'end', win: false },
];

/** What a fake audio context saw: node counts, start times, ramp targets, resumes. */
export interface FakeAudioLog {
  oscillators: number;
  noiseSources: number;
  buffers: number;
  starts: number[];
  rampTargets: number[];
  resumes: number;
}

/**
 * Just enough of an AudioContext for synth.ts and mixer.ts in node: nodes
 * connect to nothing, params keep their last value and log exponential
 * ramp targets. `state` is writable to simulate a suspended context.
 */
export function fakeAudioContext(): { ctx: AudioContext; log: FakeAudioLog } {
  const log: FakeAudioLog = { oscillators: 0, noiseSources: 0, buffers: 0, starts: [], rampTargets: [], resumes: 0 };

  const param = (value = 0) => ({
    value,
    setValueAtTime(v: number) { this.value = v; return this; },
    exponentialRampToValueAtTime(v: number) { log.rampTargets.push(v); this.value = v; return this; },
    linearRampToValueAtTime(v: number) { this.value = v; return this; },
    setTargetAtTime(v: number) { this.value = v; return this; },
  });
  const node = () => ({
    connect<T>(target: T) { return target; },
    disconnect() {},
  });
  const source = () => ({
    ...node(),
    start(t = 0) { log.starts.push(t); },
    stop() {},
  });

  const ctx = {
    currentTime: 0,
    state: 'running',
    sampleRate: 44_100,
    destination: node(),
    resume() {
      log.resumes++;
      this.state = 'running';
      return Promise.resolve();
    },
    createGain: () => ({ ...node(), gain: param(1) }),
    createBiquadFilter: () => ({ ...node(), type: 'lowpass', frequency: param(350), Q: param(1) }),
    createOscillator: () => {
      log.oscillators++;
      return { ...source(), type: 'sine', frequency: param(440) };
    },
    createBuffer: (_channels: number, length: number) => {
      log.buffers++;
      const data = new Float32Array(length);
      return { duration: length / 44_100, getChannelData: () => data };
    },
    createBufferSource: () => {
      log.noiseSources++;
      return { ...source(), buffer: null };
    },
  };
  return { ctx: ctx as unknown as AudioContext, log };
}
