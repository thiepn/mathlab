import { expect, test } from '@playwright/test';

const widths = [1440, 820, 390, 320] as const;
const routes = ['workspace', 'tools', 'visualize', 'proof', 'practice'] as const;

test('N3 layout evidence across desktop, tablet and narrow mobile widths', async ({ page }, info) => {
  test.skip(info.project.name !== 'chromium-desktop', 'Canonical visual reference set is captured in Chromium; normal suite covers other engines.');

  const pageErrors: string[] = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/#/workspace');
  await expect(page.locator('.save-state')).toHaveText('Saved locally');
  await page.getByRole('textbox', { name: 'Mathematical input' }).fill('f(x) := x^2 - 3*x + 2');
  await page.getByRole('button', { name: /Commit/ }).click();
  await expect(page.locator('.object-sidebar')).toContainText('f');

  for (const width of widths) {
    await page.setViewportSize({ width, height: width > 820 ? 900 : 800 });
    for (const route of routes) {
      await page.goto('/#/' + route);
      await expect(page.locator('#mathlab-main')).toBeVisible();

      if (route === 'workspace') {
        await expect(page.locator('.math-entry-composition')).toBeVisible();
      }
      if (route === 'tools') {
        await expect(page.locator('.tool-card').first()).toBeVisible();
        await expect(page.locator('.tool-detail')).toBeVisible();
        if (width <= 900) {
          const list = await page.locator('.tool-results').boundingBox();
          const details = await page.locator('.tool-detail').boundingBox();
          expect(list).not.toBeNull();
          expect(details).not.toBeNull();
          expect(details!.y, 'Tool details must follow the searchable operation index').toBeGreaterThan(list!.y);
        }
      }
      if (route === 'visualize') {
        await expect(page.locator('.e3-stage')).toBeVisible();
        await expect(page.locator('.e3-canvas-frame')).toBeVisible();
      }
      if (route === 'proof') {
        await expect(page.getByRole('main')).toHaveCount(1);
        await expect(page.getByRole('region', { name: 'Advanced proof obligations' })).toBeVisible();
      }
      if (route === 'practice') {
        await expect(page.locator('.m6-learning-hero')).toBeVisible();
      }

      const documentOverflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
      expect(documentOverflow, 'Page-wide horizontal overflow on ' + route + ' at ' + width + 'px').toBeLessThanOrEqual(1);
      await page.screenshot({ path: 'test-results/ui-n3-' + route + '-' + width + '.png', animations: 'disabled' });
    }
  }
  expect(pageErrors).toEqual([]);
});

test('N3 mobile Tools selection moves to the chosen operation details', async ({ page }, info) => {
  test.skip(info.project.name !== 'chromium-desktop', 'Canonical mobile touch reflow is checked in Chromium.');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/#/tools');
  const rows = page.locator('.tool-card');
  await expect(rows.nth(1)).toBeVisible();
  await rows.nth(1).click();
  await expect(rows.nth(1)).toHaveAttribute('aria-pressed', 'true');
  const detail = page.locator('.tool-detail');
  await expect(detail).toBeVisible();
  await expect.poll(async () => detail.evaluate((node) => {
    const rect = node.getBoundingClientRect();
    return rect.top >= 0 && rect.top <= window.innerHeight;
  })).toBe(true);

  const search = page.getByRole('textbox', { name: 'Search tools' });
  await search.fill('a-very-unlikely-mathlab-no-match-query');
  await expect(page.locator('.tool-card')).toHaveCount(0);
  await expect(page.locator('.tool-detail')).toHaveCount(0);
  await expect(page.locator('.tool-empty')).toBeVisible();
});
