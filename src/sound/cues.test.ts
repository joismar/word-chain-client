import { describe, expect, it } from 'vitest';
import { degree, planCue, type Cue } from './cues';
import { soundTokens } from './tokens';

export const ALL: Cue[] = [
  { type: 'press' }, { type: 'toggle', on: true }, { type: 'toggle', on: false }, { type: 'copy' },
  { type: 'room', joined: true }, { type: 'room', joined: false }, { type: 'notice' }, { type: 'count' },
  { type: 'go' }, { type: 'key' }, { type: 'delete' }, { type: 'link', letters: 3, chain: 2 }, { type: 'refuse' },
  { type: 'turn', mine: true, color: 7 }, { type: 'turn', mine: false, color: 0 },
  { type: 'tick', clock: 'turn', urgent: true }, { type: 'tick', clock: 'match', urgent: false },
  { type: 'pass' }, { type: 'timeout' }, { type: 'end', win: true }, { type: 'end', win: false },
];
const notes = (cue: Cue) => planCue(cue, () => 0.5).filter((v) => v.instrument === 'note');

describe('degree', () => {
  it('walks the D major pentatonic across octaves', () => {
    expect([0, 1, 2, 3, 4, 5, 7].map((n) => degree(n))).toEqual([62, 64, 66, 69, 71, 74, 78]);
    expect(degree(-3)).toBe(54);
  });
});

describe('planCue', () => {
  it('keeps every voice audible, in time and under the gain ceiling', () => {
    for (const cue of ALL) {
      const voices = planCue(cue, () => 0.5);
      expect(voices.length, cue.type).toBeGreaterThan(0);
      for (const v of voices) {
        expect(v.at).toBeGreaterThanOrEqual(0);
        expect(v.gain).toBeGreaterThan(0);
        expect(v.gain).toBeLessThanOrEqual(soundTokens.maxGain);
      }
    }
  });

  it('climbs one note per shared letter plus one, from a base that walks with the chain', () => {
    expect(notes({ type: 'link', letters: 2, chain: 0 }).map((v) => v.midi)).toEqual([74, 76, 78]);
    expect(notes({ type: 'link', letters: 2, chain: 1 })[0].midi).toBe(76);
  });

  it('caps the climb at five letters', () => {
    expect(notes({ type: 'link', letters: 9, chain: 0 })).toHaveLength(6);
  });

  it('plays two rising notes on my turn and one quiet note on theirs, pitched by colour', () => {
    expect(notes({ type: 'turn', mine: true, color: 0 }).map((v) => v.midi)).toEqual([74, 78]);
    expect(notes({ type: 'turn', mine: false, color: 1 })).toEqual([expect.objectContaining({ midi: 64, gain: 0.1 })]);
  });

  it('varies each key a little', () => {
    const [low] = planCue({ type: 'key' }, () => 0);
    const [high] = planCue({ type: 'key' }, () => 1);
    expect(low.pitch).not.toBe(high.pitch);
    expect(low.pitch! / 1.3).toBeCloseTo(0.94, 2);
  });

  it('ticks the match lower than the turn and adds a note when urgent', () => {
    const turn = planCue({ type: 'tick', clock: 'turn', urgent: false });
    const match = planCue({ type: 'tick', clock: 'match', urgent: false });
    expect(match[0].pitch!).toBeLessThan(turn[0].pitch!);
    expect(planCue({ type: 'tick', clock: 'turn', urgent: true })).toHaveLength(2);
  });

  it('makes the win longer than the plain end', () => {
    const last = (voices: { at: number }[]) => Math.max(...voices.map((v) => v.at));
    expect(last(planCue({ type: 'end', win: true }))).toBeGreaterThan(last(planCue({ type: 'end', win: false })));
  });
});
