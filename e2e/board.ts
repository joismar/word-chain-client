import { expect, type Page } from '@playwright/test';
import { cellRect, computeBoard } from '../src/engine/layout';
import type { TileSpec } from '../src/engine/types';

/** The tiles the app last gave the stage (exposed on the dev server). */
function tiles(page: Page): Promise<TileSpec[]> {
  return page.evaluate(() => (globalThis as { __boardTiles?: TileSpec[] }).__boardTiles ?? []);
}

/**
 * Where `text` (a regex source) reads left to right on one row, cells
 * without a tile counting as spaces. Slots (empty field cells) never match.
 */
function locate(all: TileSpec[], text: string): { row: number; col: number } | null {
  const solid = all.filter((t) => t.variant !== 'slot');
  for (const row of new Set(solid.map((t) => t.row))) {
    const cells = solid.filter((t) => t.row === row).sort((a, b) => a.col - b.col);
    const first = cells[0].col;
    const line = Array.from({ length: cells.at(-1)!.col - first + 1 }, () => ' ');
    for (const t of cells) line[t.col - first] = t.char;
    const at = new RegExp(`(^| )${text}($| )`).exec(line.join(''));
    if (at) return { row, col: first + at.index + at[1].length };
  }
  return null;
}

/** Waits until `text` is on the board and returns its first cell. */
export async function findWord(page: Page, text: string, timeout = 10_000) {
  let found: { row: number; col: number } | null = null;
  await expect.poll(async () => (found = locate(await tiles(page), text)), {
    message: `"${text}" on the board`, timeout,
  }).not.toBeNull();
  return found!;
}

export async function expectNoWord(page: Page, text: string) {
  await expect.poll(async () => locate(await tiles(page), text)).toBeNull();
}

/** Clicks the first letter of a word on the canvas. */
export async function clickWord(page: Page, text: string, timeout?: number) {
  const { row, col } = await findWord(page, text, timeout);
  const rect = cellRect(computeBoard(page.viewportSize()!), row, col);
  await page.mouse.click(rect.x + rect.width / 2, rect.y + rect.height / 2);
}

/** The canvas is up and the first scene is on it. */
export async function boardReady(page: Page) {
  await expect(page.getByTestId('game-canvas')).toHaveAttribute('data-ready', 'true', { timeout: 15_000 });
}
