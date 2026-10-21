import { expect, test, type Page } from '@playwright/test';
import { cellRect, computeBoard } from '../src/engine/layout';

/** Screen centre of a board cell for the page's current viewport. */
function cellCenter(page: Page, row: number, col: number) {
  const board = computeBoard(page.viewportSize()!);
  const rect = cellRect(board, row, col);
  return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
}

async function clickCell(page: Page, row: number, col: number) {
  const { x, y } = cellCenter(page, row, col);
  await page.mouse.click(x, y);
}

const log = (page: Page) => page.getByTestId('engine-log');

// One test at a time per worker, so a module-level list is per test.
let errors: string[] = [];

test.beforeEach(async ({ page }) => {
  errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => void (m.type() === 'error' && errors.push(m.text())));
  await page.goto('/dev/engine');
  // Pixi is lazy-loaded on this route; give a cold dev server time.
  await expect(page.getByTestId('game-canvas')).toHaveAttribute('data-ready', 'true', { timeout: 15_000 });
  await expect(page.locator('canvas')).toHaveCount(1);
});

test.afterEach(() => {
  expect(errors).toEqual([]);
});

test('mounts one canvas under StrictMode and taps tiles by action', async ({ page }) => {
  await clickCell(page, -3, -3);
  await expect(log(page)).toContainText('tap toggle menu:2');
  // A tile in the gap between letters still belongs to the word.
  await clickCell(page, -3, -5);
  await expect(log(page)).toContainText('tap toggle menu:0');
});

test('reports hover per word and clears it on leave', async ({ page }) => {
  const { x, y } = cellCenter(page, -3, -4);
  await page.mouse.move(x, y);
  await expect(log(page)).toContainText('hover toggle');
  await page.mouse.move(5, 5);
  await expect(log(page)).toContainText('hover -');
});

test('recycles exiting tiles when a word shrinks and grows', async ({ page }) => {
  await clickCell(page, 1, -5);
  await expect(log(page)).toContainText('tap extra flag:0');
  // SALA -> X: the letters at columns -4..-2 exit and stop being clickable.
  await clickCell(page, 1, -3);
  await expect(log(page)).not.toContainText('flag:2');
  await clickCell(page, 1, -5);
  await clickCell(page, 1, -3);
  await expect(log(page)).toContainText('tap extra flag:2');
});

test('types into the board field through the hidden input', async ({ page }) => {
  const input = page.getByLabel('Apelido');
  await clickCell(page, -1, -2);
  await expect(input).toBeFocused();
  await page.keyboard.type('joão d!');
  await expect(input).toHaveValue('JOAOD');
  await page.keyboard.press('Enter');
  await expect(log(page)).toContainText('submit JOAOD');
  await clickCell(page, 3, -5);
  await expect(input).toHaveValue('');
});

test('keeps cells clickable after a resize', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 700 });
  await expect(page.locator('canvas')).toHaveCount(1);
  await expect.poll(async () => {
    await clickCell(page, 3, 5);
    return log(page).textContent();
  }).toContain('tap go go:0');
  const input = page.getByLabel('Apelido');
  const box = (await input.boundingBox())!;
  const expected = cellRect(computeBoard({ width: 360, height: 700 }), -1, -5, 10);
  expect(box.x).toBeCloseTo(expected.x, 0);
  expect(box.width).toBeCloseTo(expected.width, 0);
});

test('tears the stage down and builds a new one on remount', async ({ page }) => {
  for (let i = 1; i <= 2; i++) {
    await clickCell(page, 3, 0);
    await expect(log(page)).toContainText('tap remount remount:0');
    await expect(page.getByTestId('game-canvas')).toHaveAttribute('data-ready', 'true');
    await expect(page.locator('canvas')).toHaveCount(1);
  }
  await clickCell(page, -3, -5);
  await expect(log(page)).toContainText('tap toggle menu:0');
});
