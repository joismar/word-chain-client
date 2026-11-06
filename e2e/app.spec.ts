import { expect, test } from '@playwright/test';
import { boardReady, clickWord, expectNoWord, findWord, hudButton, soundLog } from './board';

// No backend here (the socket points nowhere): the home screen works offline.
let errors: string[] = [];

test.beforeEach(async ({ page }) => {
  errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await boardReady(page);
});

test.afterEach(() => {
  expect(errors).toEqual([]);
});

test('shows the menu on the canvas under the logo', async ({ page }) => {
  await findWord(page, 'CRIAR');
  await findWord(page, 'ENTRAR');
  await expect(page.locator('canvas')).toHaveCount(1);
  await expect(page.getByRole('img', { name: 'Word Chain' })).toBeVisible();
});

test('opens the nickname field, types into it and goes back', async ({ page }) => {
  await clickWord(page, 'CRIAR');
  const input = page.getByLabel('Apelido');
  await expect(input).toBeFocused();
  await findWord(page, 'APELIDO');
  await page.keyboard.type('joão');
  await findWord(page, 'JOAO');
  await expect(hudButton(page, 'CRIAR SALA')).toBeEnabled();
  await hudButton(page, 'Voltar').click();
  await expect(input).toHaveCount(0);
  await findWord(page, 'CRIAR');
});

test('asks for the room after the nickname when joining', async ({ page }) => {
  await clickWord(page, 'ENTRAR');
  await expectNoWord(page, 'ENTRAR');
  await page.keyboard.type('ana');
  await page.keyboard.press('Enter');
  await expect(page.getByLabel('Sala')).toBeFocused();
});

test('plays nothing before a gesture and a press after one', async ({ page }) => {
  expect(await soundLog(page)).toEqual([]);
  await clickWord(page, 'CRIAR');
  await expect.poll(() => soundLog(page)).toContain('press');
  await page.getByLabel('Apelido').fill('Ana');
  await expect.poll(() => soundLog(page)).toContain('key');
});
