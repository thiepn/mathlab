import { expect, test } from '@playwright/test';

test('D1 saved object travels from notebook to graph and back without changing source', async ({ page }, info) => {
  test.skip(!['chromium-desktop', 'ios-webkit'].includes(info.project.name), 'Object journey checked on desktop Chromium and mobile WebKit.');
  await page.goto('/#/workspace');
  await expect(page.locator('.save-state')).toHaveText('Saved locally');
  const input = page.getByRole('textbox', { name: 'Mathematical input' });
  await input.fill('f(x) := x^2 + 1');
  await page.getByRole('button', { name: /Commit/ }).click();
  await expect(page.locator('.object-sidebar')).toContainText('f');
  await expect(page.getByRole('region', { name: 'Object workflow for f' })).toBeVisible();
  await page.getByRole('button', { name: 'Explore f' }).click();
  await expect(page).toHaveURL(/#\/visualize$/);
  await expect(page.locator('.e3-canvas-frame')).toBeVisible();
  await page.getByRole('button', { name: 'Edit f' }).click();
  await expect(page).toHaveURL(/#\/workspace$/);
  await expect(input).toHaveValue('f(x) := x^2 + 1');
  await expect(page.getByRole('heading', { name: 'f', exact: true })).toBeVisible();
  await page.reload();
  await expect(page.locator('.save-state')).toHaveText('Saved locally');
  await expect(page.getByRole('button', { name: 'Explore f' })).toBeVisible();
});

test('D1 tools and proof preserve active source and new work clears stale context', async ({ page }, info) => {
  test.skip(info.project.name !== 'chromium-desktop', 'Dedicated workflow assertions run in Chromium; other browser checks remain.');
  await page.goto('/#/workspace');
  await expect(page.locator('.save-state')).toHaveText('Saved locally');
  const input = page.getByRole('textbox', { name: 'Mathematical input' });
  await input.fill('f(x) := x^2 + 1');
  await page.getByRole('button', { name: /Commit/ }).click();
  await page.getByRole('button', { name: 'Tools for f' }).click();
  await expect(page.getByRole('dialog', { name: 'Tools and object inspector' })).toBeVisible();
  await page.getByRole('button', { name: 'Close tools', exact: true }).click();
  await page.getByRole('button', { name: 'Proof for f' }).click();
  await expect(page).toHaveURL(/#\/proof$/);
  await page.getByRole('button', { name: 'Workbench', exact: true }).first().click();
  await expect(input).toHaveValue('f(x) := x^2 + 1');
  await page.getByRole('button', { name: 'New work' }).click();
  await expect(page.getByRole('region', { name: 'Object workflow for f' })).toHaveCount(0);
  await expect(input).toHaveValue('');
});

test('D1 phone math input remains near the first fold and object actions do not overflow', async ({ page }, info) => {
  test.skip(info.project.name !== 'chromium-desktop', 'Canonical 390px interaction/overflow evidence captured in Chromium.');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/#/workspace');
  await expect(page.locator('.save-state')).toHaveText('Saved locally');
  const editor = page.getByRole('textbox', { name: 'Mathematical input' });
  await expect(editor).toBeVisible();
  const rect = await editor.boundingBox();
  expect(rect).not.toBeNull();
  expect(rect!.y).toBeLessThan(740);
  await editor.fill('f(x) := x^2 + 1');
  await page.getByRole('button', { name: /Commit/ }).click();
  await expect(page.getByRole('button', { name: 'Explore f' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});
