import { Container, Graphics } from 'pixi.js';
import { BOARD } from '@src/theme/palette';
import { tile as tileTokens } from '@src/theme/tokens';
import { isFaded } from './edgeFade';
import type { Board } from './layout';
import type { TileSpec } from './types';

/** Cells covered by tiles, as `row,col`; a spanning tile covers its whole square. */
export function coveredCells(specs: readonly TileSpec[]): Set<string> {
  const cells = new Set<string>();
  for (const spec of specs) {
    const reach = ((spec.span ?? 1) - 1) / 2;
    for (let row = spec.row - reach; row <= spec.row + reach; row++) {
      for (let col = spec.col - reach; col <= spec.col + reach; col++) cells.add(`${row},${col}`);
    }
  }
  return cells;
}

/**
 * The empty cell grid behind the tiles, centred on cell (0,0). Cells near
 * the screen edge drop out (edge fade), except under a tile, so a
 * translucent slot never sits on a hole.
 */
export class BoardBackground extends Container {
  private readonly cells = new Graphics();
  private drawn = '';

  constructor() {
    super({ eventMode: 'none' });
    this.addChild(this.cells);
  }

  draw(board: Board, covered: ReadonlySet<string> = new Set()) {
    const { cols, rows, pitch, cell } = board;
    const colSpan = (cols - 1) / 2;
    const rowSpan = (rows - 1) / 2;
    const kept: string[] = [];
    const visible: [number, number][] = [];
    for (let row = -rowSpan; row <= rowSpan; row++) {
      for (let col = -colSpan; col <= colSpan; col++) {
        if (!isFaded(row, col, board)) visible.push([row, col]);
        else if (covered.has(`${row},${col}`)) {
          visible.push([row, col]);
          kept.push(`${row},${col}`);
        }
      }
    }
    // Most syncs leave the faded cells alone; skip the redraw then.
    const key = `${cols}x${rows}@${pitch}|${kept.join(';')}`;
    if (key === this.drawn) return;
    this.drawn = key;

    const half = cell / 2;
    const radius = Math.max(1, cell * tileTokens.radius);
    const g = this.cells.clear();
    for (const [row, col] of visible) g.roundRect(col * pitch - half, row * pitch - half, cell, cell, radius);
    g.fill(BOARD.emptyCell);
  }
}
