import { Container, Graphics } from 'pixi.js';
import type { MotionContext } from '@src/motion/choreography';
import { burstEnd, particleAt, planBurst, waveAlpha, waveEnd, type Cell, type Particle } from '@src/motion/fx';
import { TONES } from '@src/theme/palette';
import { tile as tileTokens } from '@src/theme/tokens';
import { isFaded } from './edgeFade';
import type { Board } from './layout';
import type { TileTone } from './types';

interface Burst {
  particles: Particle[];
  color: number;
  start: number;
  end: number;
}

interface Wave {
  color: number;
  start: number;
  end: number;
}

/**
 * Draws the effects that aren't tiles: the turn wave over the empty cells
 * (`under`, between the board and the tiles) and link particles (`over`,
 * above the tiles). Redrawn every frame while something plays.
 */
export class FxLayer {
  readonly under = new Container({ eventMode: 'none' });
  readonly over = new Container({ eventMode: 'none' });
  private readonly waveCells = new Graphics();
  private readonly sparks = new Graphics();
  private bursts: Burst[] = [];
  private wave: Wave | null = null;

  constructor(
    private readonly context: () => MotionContext,
    private readonly onStart: () => void = () => {},
    private readonly now: () => number = () => performance.now(),
  ) {
    this.under.addChild(this.waveCells);
    this.over.addChild(this.sparks);
  }

  /** Anything still to draw: the ticker must keep running. */
  get busy(): boolean {
    return this.bursts.length > 0 || this.wave !== null;
  }

  /** Particles out of the letters a new word shares with the one before. */
  burst(cells: readonly Cell[], tone: TileTone) {
    const particles = planBurst(cells, this.context());
    if (!particles.length) return;
    const start = this.now();
    this.bursts.push({ particles, color: TONES[tone].face, start, end: start + burstEnd(particles) });
    this.onStart();
  }

  /** A beat in `tone` rolling over the empty cells from the centre. */
  pulse(tone: TileTone, board: Board) {
    const length = waveEnd(board.rows, board.cols, this.context());
    if (length === 0) return;
    const start = this.now();
    this.wave = { color: TONES[tone].face, start, end: start + length };
    this.onStart();
  }

  /** Draws the current frame and drops whatever has finished. */
  update(board: Board) {
    const now = this.now();
    const ctx = this.context();
    const { pitch, cell } = board;

    this.bursts = this.bursts.filter((b) => b.end > now);
    const sparks = this.sparks.clear();
    for (const burst of this.bursts) {
      for (const p of burst.particles) {
        const frame = particleAt(p, now - burst.start);
        if (!frame || frame.size <= 0) continue;
        const side = frame.size * pitch;
        sparks.rect(frame.x * pitch - side / 2, frame.y * pitch - side / 2, side, side)
          .fill({ color: burst.color, alpha: frame.alpha });
      }
    }

    if (this.wave && this.wave.end <= now) this.wave = null;
    const waveCells = this.waveCells.clear();
    if (this.wave) {
      const t = now - this.wave.start;
      const half = cell / 2;
      const radius = Math.max(1, cell * tileTokens.radius);
      const rowSpan = (board.rows - 1) / 2;
      const colSpan = (board.cols - 1) / 2;
      for (let row = -rowSpan; row <= rowSpan; row++) {
        for (let col = -colSpan; col <= colSpan; col++) {
          const alpha = waveAlpha({ row, col }, t, ctx);
          if (alpha > 0 && !isFaded(row, col, board)) {
            waveCells.roundRect(col * pitch - half, row * pitch - half, cell, cell, radius)
              .fill({ color: this.wave.color, alpha });
          }
        }
      }
    }
  }

  destroy() {
    this.bursts = [];
    this.wave = null;
    this.under.destroy({ children: true });
    this.over.destroy({ children: true });
  }
}
