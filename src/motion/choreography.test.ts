import { describe, expect, it } from 'vitest';
import type { Batch, TileSpec } from '@src/engine/types';
import {
  effectTargets, planEffect, planEnter, planExit, planPress, planRipple, planUpdate, waveDelay,
  type MotionContext,
} from './choreography';
import { tokens } from './tokens';

const spec = (key: string, row: number, col: number, extra: Partial<TileSpec> = {}): TileSpec => ({
  key, char: 'A', row, col, ...extra,
});
const ctx: MotionContext = { tokens, reduced: false };
const reduced: MotionContext = { tokens, reduced: true };
const empty: Batch = { enter: [], update: [], exit: [] };

describe('waveDelay', () => {
  const batch = [spec('c', 0, 0), spec('n', 0, 3), spec('f', 4, 3)];

  it('grows outward from the centre for entrances', () => {
    expect(waveDelay(batch[0], batch, 'out', 10)).toBe(0);
    expect(waveDelay(batch[1], batch, 'out', 10)).toBe(30);
    expect(waveDelay(batch[2], batch, 'out', 10)).toBe(50);
  });

  it('shrinks toward the centre for exits', () => {
    expect(waveDelay(batch[2], batch, 'in', 10)).toBe(0);
    expect(waveDelay(batch[0], batch, 'in', 10)).toBe(50);
  });

  it('starts a lone tile at once, wherever it is', () => {
    const far = spec('far', 9, 9);
    expect(waveDelay(far, [far], 'out', 10)).toBe(0);
  });

  it('is relative to the closest tile of the batch', () => {
    const ring = [spec('a', 0, 5), spec('b', 0, 8)];
    expect(waveDelay(ring[0], ring, 'out', 10)).toBe(0);
    expect(waveDelay(ring[1], ring, 'out', 10)).toBe(30);
  });
});

describe('planEnter', () => {
  it('fades and springs in after the wave delay', () => {
    const a = spec('a', 0, 0);
    const b = spec('b', 0, 2);
    const tweens = planEnter(b, { ...empty, enter: [a, b] }, ctx);
    expect(tweens.map((t) => t.delay)).toEqual([2 * tokens.stagger.wave, 2 * tokens.stagger.wave]);
    expect(tweens[0]).toMatchObject({ from: { alpha: 0 }, to: { alpha: 1 } });
    expect(tweens[1]).toMatchObject({ from: { scale: tokens.scale.enter }, to: { scale: 1 }, timing: { spring: 'bouncy' } });
  });

  it('starts the cursor breathing on an active slot', () => {
    const tweens = planEnter(spec('s', 0, 0, { variant: 'slot', active: true }), empty, ctx);
    expect(tweens.at(-1)).toMatchObject({ to: { caret: tokens.opacity.breathe }, breathe: true });
  });

  it('only fades under reduced motion', () => {
    const tweens = planEnter(spec('s', 0, 4, { variant: 'slot', active: true }), empty, reduced);
    expect(tweens).toEqual([{ from: { alpha: 0 }, to: { alpha: 1 }, timing: { duration: tokens.duration.fade }, delay: 0 }]);
  });
});

describe('planUpdate', () => {
  it('glides a moved tile from where it was (FLIP)', () => {
    const prev = spec('a', 2, 1);
    const next = spec('a', 1, 4);
    const [tween] = planUpdate(prev, next, { ...empty, update: [{ prev, next }] }, ctx);
    expect(tween).toMatchObject({ add: { x: -3, y: 1 }, to: { x: 0, y: 0 }, timing: { spring: 'glide' }, delay: 0 });
  });

  it('staggers moving tiles left to right, ignoring tiles that stayed', () => {
    const still = { prev: spec('s', 0, -5), next: spec('s', 0, -5, { tone: 'sky' }) };
    const moves = [0, 1, 2].map((col) => ({ prev: spec(`m${col}`, 1, col), next: spec(`m${col}`, 0, col) }));
    const batch = { ...empty, update: [still, ...moves] };
    const delays = moves.map(({ prev, next }) => planUpdate(prev, next, batch, ctx)[0].delay);
    expect(delays).toEqual([0, tokens.stagger.letter, 2 * tokens.stagger.letter]);
  });

  it('snaps moves under reduced motion', () => {
    expect(planUpdate(spec('a', 0, 0), spec('a', 1, 1), empty, reduced)).toEqual([]);
  });

  it('drops a typed letter into its slot', () => {
    const prev = spec('in:0', 0, 0, { variant: 'slot', active: true });
    const next = spec('in:0', 0, 0, { variant: 'solid' });
    const tweens = planUpdate(prev, next, empty, ctx);
    expect(tweens[0]).toMatchObject({
      from: { lift: -tokens.distance.drop, scale: tokens.scale.typed }, to: { lift: 0, scale: 1 }, timing: { spring: 'bouncy' },
    });
    // The cursor moved on: this slot stops breathing.
    expect(tweens[1]).toEqual({ to: { caret: 1 }, timing: { duration: 0 } });
  });

  it('pops an erased slot back and starts its cursor', () => {
    const prev = spec('in:1', 0, 1, { variant: 'solid' });
    const next = spec('in:1', 0, 1, { variant: 'slot', active: true });
    const tweens = planUpdate(prev, next, empty, ctx);
    expect(tweens[0]).toMatchObject({ from: { scale: tokens.scale.erase }, timing: { spring: 'snappy' } });
    expect(tweens[1]).toMatchObject({ breathe: true });
  });

  it('leaves a recolour alone', () => {
    expect(planUpdate(spec('a', 0, 0), spec('a', 0, 0, { tone: 'sky' }), empty, ctx)).toEqual([]);
  });
});

describe('planExit', () => {
  it('shrinks out, outer tiles first', () => {
    const inner = spec('i', 0, 0);
    const outer = spec('o', 0, 3);
    const batch = { ...empty, exit: [inner, outer] };
    expect(planExit(outer, batch, ctx)[0].delay).toBe(0);
    expect(planExit(inner, batch, ctx)[0]).toMatchObject({
      to: { alpha: 0, scale: tokens.scale.exit }, delay: 3 * tokens.stagger.wave,
    });
  });

  it('only fades under reduced motion', () => {
    expect(planExit(spec('o', 0, 3), empty, reduced)).toEqual([
      { to: { alpha: 0 }, timing: { duration: tokens.duration.fade }, delay: 0 },
    ]);
  });
});

describe('effects', () => {
  const live = [spec('input:0', 2, 0), spec('input:1', 2, 1), spec('chain:0', 0, 0), spec('inputx:0', 3, 0)];

  it('targets a word by id prefix, and pulses everything', () => {
    expect(effectTargets({ type: 'shake', word: 'input' }, live).map((s) => s.key)).toEqual(['input:0', 'input:1']);
    expect(effectTargets({ type: 'pulse', tone: 'amber' }, live)).toHaveLength(4);
  });

  it('links from the shared letters only, and leaves the tiles to the fx layer', () => {
    const link = { type: 'link', word: 'input', letters: 1, tone: 'emerald' } as const;
    expect(effectTargets(link, live).map((s) => s.key)).toEqual(['input:0']);
    expect(planEffect(link, live, ctx).size).toBe(0);
  });

  it('shakes and flashes rose on an invalid word', () => {
    const plans = planEffect({ type: 'shake', word: 'input' }, live, ctx);
    const [flash, shake] = plans.get('input:0')!;
    expect(flash).toMatchObject({ tint: 'rose', to: { flash: [0, tokens.opacity.flash, 0] } });
    const swings = (shake.to.nudge as number[]).slice(1, -1);
    expect(swings[0]).toBe(-tokens.distance.shake);
    // Damped: each swing flips side and shrinks.
    for (let i = 1; i < swings.length; i++) {
      expect(Math.sign(swings[i])).toBe(-Math.sign(swings[i - 1]));
      expect(Math.abs(swings[i])).toBeLessThan(Math.abs(swings[i - 1]));
    }
    expect((shake.to.nudge as number[]).at(-1)).toBe(0);
  });

  it('keeps only the flash under reduced motion', () => {
    const plans = planEffect({ type: 'shake', word: 'input' }, live, reduced);
    expect(plans.get('input:1')!.map((t) => Object.keys(t.to))).toEqual([['flash']]);
  });

  it('sends the turn pulse out from the centre in the player colour', () => {
    const plans = planEffect({ type: 'pulse', tone: 'amber' }, live, ctx);
    expect(plans.get('chain:0')![0]).toMatchObject({ tint: 'amber', delay: 0 });
    expect(plans.get('inputx:0')![0].delay).toBe(3 * tokens.stagger.wave);
  });

  it('beats harder and flashes in the last seconds', () => {
    const calm = planEffect({ type: 'tick', word: 'chain' }, live, ctx).get('chain:0')!;
    const urgent = planEffect({ type: 'tick', word: 'chain', urgent: true }, live, ctx).get('chain:0')!;
    expect(calm).toHaveLength(1);
    expect(calm[0].to.pulse).toEqual([1, tokens.scale.tick, 1]);
    expect(urgent[0].tint).toBe('rose');
    expect(urgent[1].to.pulse).toEqual([1, tokens.scale.tickUrgent, 1]);
  });
});

describe('planRipple', () => {
  const word = [0, 1, 2, 3].map((i) => spec(`w:${i}`, 0, i));

  it('bobs letters outward from the hovered one', () => {
    const plans = planRipple(word, 'w:1', ctx);
    expect([...plans.values()].map((t) => t[0].delay)).toEqual([1, 0, 1, 2].map((n) => n * tokens.stagger.letter));
  });

  it('is off under reduced motion', () => {
    expect(planRipple(word, 'w:1', reduced).size).toBe(0);
  });
});

describe('planPress', () => {
  it('squashes on press and springs back on release', () => {
    expect(planPress(true, ctx)[0]).toMatchObject({ to: { press: tokens.scale.press }, timing: { spring: 'snappy' } });
    expect(planPress(false, ctx)[0].to).toEqual({ press: 1 });
    expect(planPress(true, reduced)).toEqual([]);
  });
});

describe('countdown pop', () => {
  const big = (char: string, span: number) => spec('countdown:0', 3, 0, { char, span });

  it('pops a big tile in with a light flash', () => {
    const tweens = planEnter(big('3', 3), empty, ctx);
    expect(tweens[0]).toMatchObject({
      from: { scale: tokens.scale.countdownFrom },
      to: { scale: 1 },
      timing: { duration: tokens.duration.countdownPop, bezier: [0.2, 1.6, 0.4, 1] },
    });
    expect(tweens[1]).toMatchObject({ from: { flash: tokens.opacity.countdownFlash }, to: { flash: 0 }, tint: 'light' });
  });

  it('pops again on every new number, and just swaps it under reduced motion', () => {
    expect(planUpdate(big('3', 3), big('2', 5), empty, ctx)[0].to).toEqual({ scale: 1 });
    expect(planUpdate(big('3', 3), big('2', 5), empty, reduced)).toEqual([]);
  });
});
