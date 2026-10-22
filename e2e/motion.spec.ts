import { expect, test, type Page } from '@playwright/test';
import { cellRect, computeBoard } from '../src/engine/layout';

function cellCenter(page: Page, row: number, col: number) {
  const rect = cellRect(computeBoard(page.viewportSize()!), row, col);
  return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
}

const status = (page: Page) => page.getByTestId('motion-status');
const button = (page: Page, name: string) => page.getByRole('button', { name, exact: true });

async function started(page: Page) {
  const text = await page.getByTestId('motion-started').textContent();
  return Number(text!.replace(/\D/g, ''));
}

/** Checks that something started moving, then waits until everything has landed. */
async function playsAndSettles(page: Page, run: () => Promise<unknown>) {
  const before = await started(page);
  await run();
  await expect.poll(() => started(page)).toBeGreaterThan(before);
  await expect(status(page)).toHaveText('animações: 0', { timeout: 5_000 });
}

let errors: string[] = [];

test.beforeEach(async ({ page }) => {
  errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => void (m.type() === 'error' && errors.push(m.text())));
  await page.goto('/dev/motion');
  await expect(page.getByTestId('game-canvas')).toHaveAttribute('data-ready', 'true', { timeout: 15_000 });
  // The menu waves in on load.
  await expect(status(page)).toHaveText('animações: 0', { timeout: 5_000 });
});

test.afterEach(() => {
  expect(errors).toEqual([]);
});

test('swaps screens with a wave driven by the Pixi ticker', async ({ page }) => {
  await playsAndSettles(page, () => button(page, 'Trocar tela').click());
  // The new screen is clickable once it lands.
  const { x, y } = cellCenter(page, -6, -5);
  await playsAndSettles(page, () => page.mouse.click(x, y));
  await expect(page.getByTestId('motion-log')).toContainText('tap leave');
});

test('plays every game choreography and comes to rest', async ({ page }) => {
  // Ten choreographies, each waited out to the end.
  test.slow();
  await playsAndSettles(page, () => button(page, 'Trocar tela').click());
  for (let i = 0; i < 3; i++) await playsAndSettles(page, () => button(page, 'Digitar').click());
  await playsAndSettles(page, () => button(page, 'Apagar').click());
  await playsAndSettles(page, () => button(page, 'Palavra aceita').click());
  await playsAndSettles(page, () => button(page, 'Palavra aceita').click());
  await playsAndSettles(page, () => button(page, 'Palavra inválida').click());
  await playsAndSettles(page, () => button(page, 'Troca de turno').click());
  await playsAndSettles(page, () => button(page, 'Timer').click());
  await button(page, 'Parar timer').click();
});

test('ripples a word on hover and squashes it on press', async ({ page }) => {
  const { x, y } = cellCenter(page, -1, -3);
  await playsAndSettles(page, () => page.mouse.move(x, y));
  await playsAndSettles(page, () => page.mouse.down());
  await playsAndSettles(page, () => page.mouse.up());
});

test('keeps working with reduced motion forced on', async ({ page }) => {
  await page.getByLabel('Reduced motion').selectOption('true');
  await playsAndSettles(page, () => button(page, 'Trocar tela').click());
  await playsAndSettles(page, () => button(page, 'Palavra inválida').click());
});

test('applies edited tokens live', async ({ page }) => {
  // Relative timing: load slows both swaps alike, only the token differs.
  const swap = async () => {
    const t0 = Date.now();
    await playsAndSettles(page, () => button(page, 'Trocar tela').click());
    return Date.now() - t0;
  };
  const baseline = await swap();
  await page.getByText('Tokens', { exact: true }).click();
  // The slider tops out at 1500 ms, far above the default exit.
  await page.getByLabel('duration.exit').press('End');
  await expect(page.getByLabel('duration.exit')).toHaveValue('1500');
  const slowed = await swap();
  expect(slowed - baseline).toBeGreaterThan(700);
});
