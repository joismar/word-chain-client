import { Container, Graphics } from 'pixi.js';
import { BOARD } from '@src/theme/palette';
import type { Board } from './layout';

/** The empty cell grid behind the tiles, centred on cell (0,0). */
export class BoardBackground extends Container {
  private readonly cells = new Graphics();

  constructor() {
    super({ eventMode: 'none' });
    this.addChild(this.cells);
  }

  draw(board: Board) {
    const { cols, rows, pitch, cell } = board;
    const half = cell / 2;
    const radius = Math.max(1, cell * 0.08);
    const colSpan = (cols - 1) / 2;
    const rowSpan = (rows - 1) / 2;
    const g = this.cells.clear();
    for (let row = -rowSpan; row <= rowSpan; row++) {
      for (let col = -colSpan; col <= colSpan; col++) {
        g.roundRect(col * pitch - half, row * pitch - half, cell, cell, radius);
      }
    }
    g.fill(BOARD.emptyCell);
  }
}
