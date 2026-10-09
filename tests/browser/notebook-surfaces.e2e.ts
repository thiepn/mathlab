import { expect, test } from '@playwright/test';

// The full browser suite covers all engines. This focused visual-contract test
// protects the N2 index and core learning/proof navigation at desktop and touch sizes.
test('N2 instrument pages preserve operation selection and mobile reflow', async ({ page }, testInfo) => {
  test.skip(!['chromium-desktop', 'ios-webkit'].includes(testInfo.project.name),
    'Focused desktop and phone check; existing acceptance suite covers remaining engines.');

  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/#/tools');
  await expect(page.getByRole('heading', { name: 'Find the operation you need.' })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Search tools' })).toBeVisible();

  const rows = page.locator('.tool-card');
  await expect(rows.first()).toBeVisible();
  await expect(rows.first().locator('.tool-index')).toHaveText('01');
  await expect(rows.first()).toHaveAttribute('aria-pressed', 'true');

  const second = rows.nth(1);
  if (await second.count()) {
    await second.click();
    await expect(second).toHaveAttribute('aria-pressed', 'true');
  }

  const search = page.getByRole('textbox', { name: 'Search tools' });
  await search.fill('regression');
  await expect(rows.first()).toBeVisible();
  await expect(rows.first().locator('.tool-index')).toHaveText('01');

  for (const route of ['tools', 'visualize', 'proof', 'practice']) {
    await page.goto('/#/' + route);
    await expect(page.locator('#mathlab-main')).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, 'horizontal overflow in ' + route).toBeLessThanOrEqual(1);
  }
  await expect(page.locator('.m6-learning-hero')).toBeVisible();
  expect(errors).toEqual([]);
});
