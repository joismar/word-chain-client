import { describe, expect, it } from 'vitest';
import { isFaded } from './edgeFade';

const size = { rows: 41, cols: 41 };
const fade = { depth: 3, density: 0.5, curve: 1.4, seed: 7 };

/** Share of dropped cells `edge` cells in from the border. */
function ring(edge: number, f = fade) {
  const span = 20 - edge;
  const cells: [number, number][] = [];
  for (let i = -span; i <= span; i++) cells.push([-span, i], [span, i], [i, -span], [i, span]);
  return cells.filter(([r, c]) => isFaded(r, c, size, f)).length / cells.length;
}

describe('edge fade', () => {
  it('drops cells only within `depth` of the edge', () => {
    for (let row = -20; row <= 20; row++) {
      for (let col = -20; col <= 20; col++) {
        const edge = Math.min(20 - Math.abs(row), 20 - Math.abs(col));
        if (edge >= fade.depth) expect(isFaded(row, col, size, fade)).toBe(false);
      }
    }
  });

  it('drops fewer cells further in', () => {
    const shares = [0, 1, 2].map((edge) => ring(edge));
    expect(shares[0]).toBeGreaterThan(shares[1]);
    expect(shares[1]).toBeGreaterThan(shares[2]);
    expect(shares[0]).toBeGreaterThan(0.3);
    expect(shares[0]).toBeLessThan(0.7);
  });

  it('is stable and changes with the seed', () => {
    expect(isFaded(-20, 3, size, fade)).toBe(isFaded(-20, 3, size, fade));
    const pattern = (seed: number) => Array.from({ length: 41 }, (_, c) => isFaded(-20, c - 20, size, { ...fade, seed }));
    expect(pattern(7)).not.toEqual(pattern(8));
  });

  it('keeps every cell with zero density', () => {
    expect(ring(0, { ...fade, density: 0 })).toBe(0);
  });
});
