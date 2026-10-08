import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';

test('physical qualification is explicitly manual and diagnostics work on browser/device projects', async ({ page }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await page.goto('/qa/');
  await expect(page).toHaveTitle('Device qualification · MathLab');
  await expect(page.getByRole('heading', { name: 'Real-device evidence' })).toBeVisible();
  await expect(page.locator('[data-target]')).toHaveCount(9);
  await expect(page.locator('.target select')).toHaveCount(9);
  await expect(page.locator('.target select option[value="not-run"]')).toHaveCount(9);
  await expect(page.locator('#completion')).toContainText('0 of 9');
  await expect(page.locator('#completion')).toContainText('Qualification incomplete.');

  await page.getByRole('button', { name: 'Run browser diagnostics' }).click();
  await expect(page.locator('#automatic-results li')).toHaveCount(5);
  await expect(page.locator('#automatic-results [data-state="fail"]')).toHaveCount(0);
  await expect(page.locator('#run-state')).toContainText('Physical tests remain manual');
  await expect(page.locator('#completion')).toContainText('0 of 9');

  await page.locator('#result-android-chrome').selectOption('pass');
  await expect(page.locator('#completion')).toContainText('0 of 9');
  await page.locator('#evidence-android-chrome').fill('Physical device model, Android version, browser build, date and observed behavior recorded');
  await expect(page.locator('#completion')).toContainText('1 of 9');
  await expect(page.locator('#completion')).toContainText('Qualification incomplete.');

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  expect(pageErrors).toEqual([]);
});

test('QA page exposes automated accessibility semantics', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop', 'Canonical DOM axe scan runs on desktop; other browser engines cover layout and diagnostics.');
  await page.goto('/qa/');
  const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
  expect(result.violations, JSON.stringify(result.violations, null, 2)).toEqual([]);
});

test('JSON evidence export remains incomplete unless physical targets are documented', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop', 'Browser download contract is checked once on desktop.');
  await page.goto('/qa/');
  await page.locator('#result-android-chrome').selectOption('pass');
  await page.locator('#evidence-android-chrome').fill('Test fixture: manual entry, not a real-device pass');
  const downloadEvent = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export JSON report' }).click();
  const download = await downloadEvent;
  expect(download.suggestedFilename()).toBe('mathlab-q1-device-evidence.json');
  const exported = JSON.parse(await readFile(await download.path(), 'utf8'));
  expect(exported.schema).toBe('mathlab-q1-device-evidence-v1');
  expect(exported.assessment).toBe('incomplete');
  expect(exported.automated).toEqual([]);
  expect(exported.manual).toHaveLength(9);
  expect(exported.manual[0].result).toBe('pass');
  expect(exported.manual[1].result).toBe('not-run');
  expect(exported.caveat).toContain('not physical-device or screen-reader certification');
});
