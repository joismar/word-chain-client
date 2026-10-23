import type { MotionContext } from './choreography';

/**
 * Board effects that aren't tiles: link particles and the turn wave over the
 * empty cells. Plans and samplers are pure, in board pitches and ms; the
 * FxLayer only draws what they return.
 */

export interface Cell {
  row: number;
  col: number;
}

export interface Particle {
  /** Start, at the centre of a shared letter. */
  x: number;
  y: number;
  /** Total travel. */
  dx: number;
  dy: number;
  size: number;
  /** From the moment the burst was asked for. */
  delay: number;
  life: number;
}

export interface ParticleFrame {
  x: number;
  y: number;
  size: number;
  alpha: number;
}

/**
 * Flat squares flying out of the letters a word shares with the one before.
 * They wait for the word to land, then leave letter by letter, left to right.
 */
export function planBurst(cells: readonly Cell[], { tokens, reduced }: MotionContext, random = Math.random): Particle[] {
  if (reduced) return [];
  const count = Math.round(tokens.count.particles);
  const ordered = [...cells].sort((a, b) => a.col - b.col);
  return ordered.flatMap((cell, i) => Array.from({ length: count }, (_, k) => {
    const angle = ((k + random() * 0.6) / count) * Math.PI * 2;
    const reach = tokens.distance.burst * (0.6 + random() * 0.4);
    return {
      x: cell.col,
      y: cell.row,
      dx: Math.cos(angle) * reach,
      dy: Math.sin(angle) * reach,
      size: tokens.distance.particle,
      delay: tokens.duration.land + i * tokens.stagger.letter,
      life: tokens.duration.burst,
    };
  }));
}

const outCubic = (t: number) => 1 - (1 - t) ** 3;

/** Where a particle is `t` ms after its burst was asked for; null before it starts or once it is gone. */
export function particleAt(p: Particle, t: number): ParticleFrame | null {
  const local = (t - p.delay) / p.life;
  if (local < 0 || local >= 1) return null;
  const travel = outCubic(local);
  return {
    x: p.x + p.dx * travel,
    y: p.y + p.dy * travel,
    size: p.size * (1 - local),
    alpha: 1 - local * local,
  };
}

/** When the last particle of a burst is gone. */
export const burstEnd = (particles: readonly Particle[]) => Math.max(0, ...particles.map((p) => p.delay + p.life));

/**
 * Tint of an empty cell `t` ms into the turn wave: one soft beat that rolls
 * out from the centre of the board.
 */
export function waveAlpha(cell: Cell, t: number, { tokens, reduced }: MotionContext): number {
  if (reduced) return 0;
  const local = (t - Math.hypot(cell.row, cell.col) * tokens.stagger.wave) / tokens.duration.wave;
  if (local <= 0 || local >= 1) return 0;
  return tokens.opacity.wave * Math.sin(local * Math.PI);
}

/** When the wave has crossed a board of `rows` x `cols` cells centred on (0,0). */
export function waveEnd(rows: number, cols: number, { tokens, reduced }: MotionContext): number {
  if (reduced) return 0;
  return Math.hypot((rows - 1) / 2, (cols - 1) / 2) * tokens.stagger.wave + tokens.duration.wave;
}
