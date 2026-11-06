import type { Voice } from './cues';
import { soundTokens, type SoundTokens } from './tokens';

/**
 * The only code that builds audio nodes: plays planned voices on any
 * BaseAudioContext (live, or offline to render a WAV).
 */

const mtof = (midi: number) => 440 * 2 ** ((midi - 69) / 12);

interface Filter { type: BiquadFilterType; freq: number; q: number }

/** Start near silence, rise over `attack`, fall exponentially to the floor over `decay`. */
function envelope(g: GainNode, t: number, peak: number, attack: number, decay: number, tokens: SoundTokens) {
  g.gain.setValueAtTime(tokens.start, t);
  g.gain.exponentialRampToValueAtTime(peak, t + attack);
  g.gain.exponentialRampToValueAtTime(tokens.floor, t + attack + decay);
}

function filtered(ctx: BaseAudioContext, from: AudioNode, filter: Filter): AudioNode {
  const f = ctx.createBiquadFilter();
  f.type = filter.type;
  f.frequency.value = filter.freq;
  f.Q.value = filter.q;
  from.connect(f);
  return f;
}

function osc(
  ctx: BaseAudioContext, dest: AudioNode, t: number, tokens: SoundTokens,
  { type = 'sine', freq, freqTo, gain, decay, filter }:
  { type?: OscillatorType; freq: number; freqTo?: number; gain: number; decay: number; filter?: Filter },
) {
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (freqTo) o.frequency.exponentialRampToValueAtTime(freqTo, t + tokens.attack + decay);
  envelope(g, t, gain, tokens.attack, decay, tokens);
  (filter ? filtered(ctx, o, filter) : o).connect(g);
  g.connect(dest);
  o.start(t);
  o.stop(t + tokens.attack + decay + tokens.tail);
}

const noiseBuffers = new WeakMap<BaseAudioContext, AudioBuffer>();

function noise(
  ctx: BaseAudioContext, dest: AudioNode, t: number, tokens: SoundTokens,
  { dur, gain, filter }: { dur: number; gain: number; filter: Filter },
) {
  let buffer = noiseBuffers.get(ctx);
  if (!buffer) {
    buffer = ctx.createBuffer(1, Math.round(ctx.sampleRate * tokens.noise.seconds), ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    noiseBuffers.set(ctx, buffer);
  }
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  const g = ctx.createGain();
  envelope(g, t, gain, tokens.noiseAttack, dur, tokens);
  filtered(ctx, src, filter).connect(g);
  g.connect(dest);
  src.start(t, Math.random() * tokens.noise.offset);
  src.stop(t + dur + tokens.tail);
}

function hit(ctx: BaseAudioContext, dest: AudioNode, t: number, pitch: number, gain: number, tokens: SoundTokens) {
  const { hit: h } = tokens;
  noise(ctx, dest, t, tokens, {
    dur: h.noise.dur,
    gain: gain * h.noise.share,
    filter: { type: 'bandpass', freq: h.noise.freq * pitch, q: h.noise.q },
  });
  osc(ctx, dest, t, tokens, { freq: h.freq * pitch, freqTo: h.freqTo * pitch, gain, decay: h.decay });
}

function note(ctx: BaseAudioContext, dest: AudioNode, t: number, midi: number, gain: number, len: number, tokens: SoundTokens) {
  const { fourth, octave } = tokens.note;
  const f = mtof(midi);
  osc(ctx, dest, t, tokens, { freq: f, gain, decay: len });
  osc(ctx, dest, t, tokens, { freq: f * fourth.ratio, gain: gain * fourth.share, decay: fourth.decay });
  osc(ctx, dest, t, tokens, { type: 'triangle', freq: f * octave.ratio, gain: gain * octave.share, decay: len * octave.len });
}

function thud(ctx: BaseAudioContext, dest: AudioNode, t: number, midi: number, gain: number, len: number, tokens: SoundTokens) {
  const { thud: th } = tokens;
  const f = mtof(midi);
  osc(ctx, dest, t, tokens, {
    type: 'triangle', freq: f, freqTo: f * th.drop, gain, decay: len,
    filter: { type: 'lowpass', freq: th.filter.freq, q: th.filter.q },
  });
  noise(ctx, dest, t, tokens, {
    dur: th.noise.dur,
    gain: gain * th.noise.share,
    filter: { type: 'lowpass', freq: th.noise.freq, q: th.noise.q },
  });
}

/** Schedules `voices` from `t0` (context time, seconds) into `dest`. */
export function playVoices(
  ctx: BaseAudioContext, dest: AudioNode, t0: number, voices: readonly Voice[], tokens: SoundTokens = soundTokens,
): void {
  for (const v of voices) {
    const t = t0 + v.at;
    const gain = Math.min(v.gain, tokens.maxGain);
    if (v.instrument === 'hit') hit(ctx, dest, t, v.pitch ?? 1, gain, tokens);
    else if (v.instrument === 'note') note(ctx, dest, t, v.midi ?? tokens.scale.root, gain, v.len ?? 0, tokens);
    else thud(ctx, dest, t, v.midi ?? tokens.scale.root, gain, v.len ?? 0, tokens);
  }
}
