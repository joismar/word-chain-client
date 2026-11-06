import { describe, expect, it } from 'vitest';
import type { MotionContext } from './choreography';
import { burstEnd, particleAt, planBurst, waveAlpha, waveEnd } from './fx';
import { tokens } from './tokens';

const ctx: MotionContext = { tokens, reduced: false };
const reduced: MotionContext = { tokens, reduced: true };
const half = () => 0.5;

describe('planBurst', () => {
  const cells = [{ row: 1, col: 3 }, { row: 1, col: 2 }];

  it('sends a ring of particles out of every shared letter', () => {
    const particles = planBurst(cells, ctx, half);
    expect(particles).toHaveLength(2 * tokens.count.particles);
    for (const p of particles) {
      expect(Math.hypot(p.dx, p.dy)).toBeCloseTo(tokens.distance.burst * 0.8);
      expect(p.size).toBe(tokens.distance.particle);
    }
    const angles = new Set(particles.filter((p) => p.x === 2).map((p) => Math.atan2(p.dy, p.dx).toFixed(3)));
    expect(angles.size).toBe(tokens.count.particles);
  });

  it('waits for the word to land, then goes letter by letter from the left', () => {
    const particles = planBurst(cells, ctx, half);
    const first = particles.filter((p) => p.x === 2);
    const second = particles.filter((p) => p.x === 3);
    expect(first.every((p) => p.delay === tokens.duration.land)).toBe(true);
    expect(second.every((p) => p.delay === tokens.duration.land + tokens.stagger.letter)).toBe(true);
    expect(burstEnd(particles)).toBe(tokens.duration.land + tokens.stagger.letter + tokens.duration.burst);
  });

  it('plays nothing under reduced motion or with nothing shared', () => {
    expect(planBurst(cells, reduced)).toEqual([]);
    expect(planBurst([], ctx)).toEqual([]);
    expect(burstEnd([])).toBe(0);
  });
});

describe('particleAt', () => {
  const p = { x: 0, y: 0, dx: 1, dy: 0, size: 0.2, delay: 100, life: 400 };

  it('is absent before its delay and after its life', () => {
    expect(particleAt(p, 99)).toBeNull();
    expect(particleAt(p, 500)).toBeNull();
  });

  it('starts whole on the letter and slows down, shrinking and fading as it goes', () => {
    expect(particleAt(p, 100)).toEqual({ x: 0, y: 0, size: 0.2, alpha: 1 });
    const mid = particleAt(p, 300)!;
    expect(mid.x).toBeCloseTo(0.875);
    expect(mid.size).toBeCloseTo(0.1);
    expect(mid.alpha).toBeCloseTo(0.75);
  });
});

describe('waveAlpha', () => {
  it('beats once per cell, later the farther it is from the centre', () => {
    const centre = { row: 0, col: 0 };
    const far = { row: 3, col: 4 };
    const peak = tokens.duration.wave / 2;
    expect(waveAlpha(centre, peak, ctx)).toBeCloseTo(tokens.opacity.wave);
    expect(waveAlpha(far, 5 * tokens.stagger.wave, ctx)).toBe(0);
    expect(waveAlpha(far, 5 * tokens.stagger.wave + peak, ctx)).toBeCloseTo(tokens.opacity.wave);
    expect(waveAlpha(centre, tokens.duration.wave, ctx)).toBe(0);
  });

  it('ends once the farthest corner has beaten', () => {
    const end = waveEnd(7, 9, ctx);
    expect(end).toBeCloseTo(5 * tokens.stagger.wave + tokens.duration.wave);
    expect(waveAlpha({ row: 3, col: 4 }, end, ctx)).toBe(0);
  });

  it('stays still under reduced motion', () => {
    expect(waveAlpha({ row: 0, col: 0 }, tokens.duration.wave / 2, reduced)).toBe(0);
    expect(waveEnd(7, 9, reduced)).toBe(0);
  });
});
