export interface Viewport {
  width: number;
  height: number;
}

export interface BoardOptions {
  /** Cell plus gap in CSS pixels on roomy screens (1.6rem + 0.2rem). */
  maxPitch?: number;
  /** Columns that must fit across, shrinking the cell on narrow screens. */
  minCols?: number;
  /** Fraction of the pitch used as the gap between cells. */
  gapRatio?: number;
}

/** Cell geometry for a viewport. Board space has (0,0) at the centre cell. */
export interface Board {
  width: number;
  height: number;
  pitch: number;
  cell: number;
  gap: number;
  cols: number;
  rows: number;
  /** Screen position of the centre of cell (0,0). */
  originX: number;
  originY: number;
}

const DEFAULTS: Required<BoardOptions> = {
  maxPitch: 28.8,
  minCols: 15,
  gapRatio: 0.2 / 1.8,
};

const odd = (n: number) => (n % 2 === 0 ? n + 1 : n);

export function computeBoard(viewport: Viewport, options: BoardOptions = {}): Board {
  const { maxPitch, minCols, gapRatio } = { ...DEFAULTS, ...options };
  const width = Math.max(0, viewport.width);
  const height = Math.max(0, viewport.height);
  const pitch = width > 0 ? Math.min(maxPitch, width / minCols) : maxPitch;
  const gap = pitch * gapRatio;
  return {
    width,
    height,
    pitch,
    cell: pitch - gap,
    gap,
    cols: odd(Math.max(1, Math.ceil(width / pitch))),
    rows: odd(Math.max(1, Math.ceil(height / pitch))),
    originX: width / 2,
    originY: height / 2,
  };
}

/** Centre of a cell in board space. */
export function cellToPoint(board: Board, row: number, col: number) {
  return { x: col * board.pitch, y: row * board.pitch };
}

export function pointToCell(board: Board, x: number, y: number) {
  return { row: Math.round(y / board.pitch) || 0, col: Math.round(x / board.pitch) || 0 };
}

/** Screen rectangle (CSS pixels) covering `length` cells from (row, col) rightwards. */
export function cellRect(board: Board, row: number, col: number, length = 1) {
  return {
    x: board.originX + col * board.pitch - board.cell / 2,
    y: board.originY + row * board.pitch - board.cell / 2,
    width: (length - 1) * board.pitch + board.cell,
    height: board.cell,
  };
}
