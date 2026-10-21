import { describe, expect, it } from 'vitest';
import { cellRect, cellToPoint, computeBoard, pointToCell } from './layout';

describe('computeBoard', () => {
  it('keeps the desktop pitch and fills the viewport with odd counts', () => {
    const board = computeBoard({ width: 1280, height: 720 });
    expect(board.pitch).toBe(28.8);
    expect(board.cols % 2).toBe(1);
    expect(board.rows % 2).toBe(1);
    expect(board.cols * board.pitch).toBeGreaterThanOrEqual(1280);
    expect(board.rows * board.pitch).toBeGreaterThanOrEqual(720);
  });

  it('shrinks the cell so a narrow phone still fits the minimum columns', () => {
    const board = computeBoard({ width: 320, height: 640 }, { minCols: 15 });
    expect(board.pitch).toBeCloseTo(320 / 15);
    expect(board.cols).toBeGreaterThanOrEqual(15);
  });

  it('splits the pitch into cell and gap by ratio', () => {
    const board = computeBoard({ width: 1280, height: 720 });
    expect(board.cell + board.gap).toBeCloseTo(board.pitch);
    expect(board.gap / board.pitch).toBeCloseTo(0.2 / 1.8);
  });

  it('centres the origin cell on the viewport', () => {
    const board = computeBoard({ width: 1000, height: 600 });
    expect(board.originX).toBe(500);
    expect(board.originY).toBe(300);
  });

  it('survives an empty viewport', () => {
    const board = computeBoard({ width: 0, height: 0 });
    expect(board.cols).toBe(1);
    expect(board.rows).toBe(1);
    expect(Number.isFinite(board.pitch)).toBe(true);
  });
});

describe('coordinates', () => {
  const board = computeBoard({ width: 1000, height: 600 });

  it('maps (0,0) to the board origin and steps one pitch per cell', () => {
    expect(cellToPoint(board, 0, 0)).toEqual({ x: 0, y: 0 });
    expect(cellToPoint(board, -2, 3)).toEqual({ x: 3 * board.pitch, y: -2 * board.pitch });
  });

  it('round-trips points inside a cell back to it', () => {
    const { x, y } = cellToPoint(board, 4, -7);
    expect(pointToCell(board, x + board.cell * 0.4, y - board.cell * 0.4)).toEqual({ row: 4, col: -7 });
  });

  it('gives the screen rectangle of a run of cells', () => {
    const rect = cellRect(board, 0, 0, 3);
    expect(rect.x).toBeCloseTo(500 - board.cell / 2);
    expect(rect.y).toBeCloseTo(300 - board.cell / 2);
    expect(rect.width).toBeCloseTo(2 * board.pitch + board.cell);
    expect(rect.height).toBeCloseTo(board.cell);
  });
});
