import { describe, expect, it } from 'vitest';
import { planCue } from './cues';
import { playVoices } from './synth';
import { ALL_CUES, fakeAudioContext } from './testing';
import { soundTokens } from './tokens';

describe('playVoices', () => {
  it('builds a marimba note from three oscillators', () => {
    const { ctx, log } = fakeAudioContext();
    playVoices(ctx, ctx.destination, 0, [{ at: 0, instrument: 'note', midi: 62, gain: 0.2, len: 0.3 }]);
    expect(log.oscillators).toBe(3);
    expect(log.noiseSources).toBe(0);
  });

  it('builds a hit from a knock and a noise burst', () => {
    const { ctx, log } = fakeAudioContext();
    playVoices(ctx, ctx.destination, 0, [{ at: 0, instrument: 'hit', pitch: 1, gain: 0.2 }]);
    expect(log.oscillators).toBe(1);
    expect(log.noiseSources).toBe(1);
  });

  it('never ramps to zero', () => {
    const { ctx, log } = fakeAudioContext();
    for (const cue of ALL_CUES) playVoices(ctx, ctx.destination, 0, planCue(cue, () => 0.5));
    expect(log.rampTargets.length).toBeGreaterThan(0);
    expect(Math.min(...log.rampTargets)).toBeGreaterThanOrEqual(soundTokens.floor);
  });

  it('schedules from t0', () => {
    const { ctx, log } = fakeAudioContext();
    for (const cue of ALL_CUES) playVoices(ctx, ctx.destination, 5, planCue(cue, () => 0.5));
    expect(Math.min(...log.starts)).toBeGreaterThanOrEqual(5);
  });

  it('makes the noise buffer once per context', () => {
    const { ctx, log } = fakeAudioContext();
    const hit = { at: 0, instrument: 'hit', pitch: 1, gain: 0.2 } as const;
    playVoices(ctx, ctx.destination, 0, [hit, hit]);
    expect(log.buffers).toBe(1);
  });
});
