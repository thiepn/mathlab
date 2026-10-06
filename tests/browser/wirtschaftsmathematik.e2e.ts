import { expect, test } from '@playwright/test';

async function commit(page: import('@playwright/test').Page, source: string) {
  await page.goto('/#/workspace');
  const input = page.getByRole('textbox', { name: 'Mathematical input' });
  await input.fill(source);
  await page.getByRole('button', { name: /Commit/ }).click();
}

test('P7 time-series workflow is reachable and executable through the shared tools drawer', async ({ page }) => {
  await commit(page, 'data(100,103,102,108,112,115,117,121)');
  await page.getByRole('button', { name: /All tools/ }).click();

  const drawer = page.getByRole('dialog', { name: 'Tools and object inspector' });
  const timeSeriesAction = drawer.getByRole('button', { name: /Time-series trend & autocorrelation/ });
  await timeSeriesAction.scrollIntoViewIfNeeded();
  await expect(timeSeriesAction).toBeVisible();
  await timeSeriesAction.click();
  await drawer.getByLabel('Maximum ACF lag').fill('4');
  await drawer.getByRole('button', { name: 'Analyze time series' }).click();

  const result = page.locator('#mathlab-result');
  await expect(result).toBeVisible();
  await expect(result.getByText('Linear time trend', { exact: true })).toBeVisible();
  await expect(result.getByText('Autocorrelation', { exact: true })).toBeVisible();
});

test('P7 simplex and assignment produce optimized results from the unified capability surface', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop', 'Optimization acceptance runs once; the shared browser/device suite covers platform behavior.');

  await commit(page, '[[1,1,4],[1,0,2],[0,1,3]]');
  await page.getByRole('button', { name: /All tools/ }).click();
  let drawer = page.getByRole('dialog', { name: 'Tools and object inspector' });
  await expect(drawer.getByText('Optimization & operations research', { exact: true })).toBeVisible();
  await drawer.getByRole('button', { name: /Canonical simplex linear program/ }).click();
  await drawer.getByLabel('Objective vector c').fill('[3,2]');
  await drawer.getByRole('button', { name: 'Solve with simplex' }).click();
  await expect(page.locator('#mathlab-result').getByText('Canonical simplex optimum', { exact: true })).toBeVisible();
  await expect(page.locator('#mathlab-result')).toContainText('10');

  await commit(page, '[[9,2,7],[6,4,3],[5,8,1]]');
  await page.getByRole('button', { name: /All tools/ }).click();
  drawer = page.getByRole('dialog', { name: 'Tools and object inspector' });
  await drawer.getByRole('button', { name: /Optimal assignment/ }).click();
  await drawer.getByLabel('Objective').selectOption('min');
  await drawer.getByRole('button', { name: 'Solve assignment' }).click();
  await expect(page.locator('#mathlab-result').getByText('Optimal assignment', { exact: true })).toBeVisible();
  await expect(page.locator('#mathlab-result')).toContainText('9');
});
