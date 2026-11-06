import { board as boardTokens } from '@src/theme/tokens';

export interface EdgeFade {
  /** Cells from the screen edge in which cells may drop. */
  depth: number;
  /** Chance of dropping on the outermost cells. */
  density: number;
  /** Exponent of the fall-off towards `depth`. */
  curve: number;
  seed: number;
}

/** Stable pseudo-random number in [0, 1) for a cell: the same cells drop on every render. */
export function cellNoise(row: number, col: number, seed: number): number {
  const x = Math.sin(row * 127.1 + col * 311.7 + seed * 74.7) * 43758.5453;
  return x - Math.floor(x);
}

/**
 * Whether the empty cell at (row, col) drops out of a board of `rows` x
 * `cols` (both odd, centred on 0,0). Cells close to the edge drop more
 * often, for a pixelated fade into the background.
 */
export function isFaded(
  row: number,
  col: number,
  size: { rows: number; cols: number },
  fade: EdgeFade = boardTokens.edgeFade,
): boolean {
  const rowSpan = (size.rows - 1) / 2;
  const colSpan = (size.cols - 1) / 2;
  const edge = Math.min(rowSpan - Math.abs(row), colSpan - Math.abs(col));
  if (edge < 0 || edge >= fade.depth) return false;
  const chance = fade.density * (1 - edge / fade.depth) ** fade.curve;
  return cellNoise(row, col, fade.seed) < chance;
}
