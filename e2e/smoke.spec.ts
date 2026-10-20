import { expect, test } from '@playwright/test';

test('home screen renders without runtime errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));

  await page.goto('/');

  const text = page.locator('#root');
  await expect(text).toContainText(/C\s*R\s*I\s*A\s*R/);
  await expect(text).toContainText(/E\s*N\s*T\s*R\s*A\s*R/);
  expect(errors).toEqual([]);
});
