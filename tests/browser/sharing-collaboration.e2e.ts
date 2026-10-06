import { expect, test } from '@playwright/test';

async function commit(page: import('@playwright/test').Page, source: string) {
  await page.goto('/#/workspace');
  const input = page.getByRole('textbox', { name: 'Mathematical input' });
  await input.fill(source);
  await page.getByRole('button', { name: /Commit/ }).click();
}

async function createShareLink(page: import('@playwright/test').Page) {
  await commit(page, 'a := 2');
  await page.getByRole('button', { name: 'Share', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Create a read-only snapshot' });
  await expect(dialog).toBeVisible();
  await dialog.getByLabel('Snapshot title').fill('Shared quadratic model');
  await dialog.getByLabel('Note for the recipient').fill('Review the model before making your own copy.');
  await dialog.getByRole('button', { name: 'Create snapshot' }).click();
  const link = dialog.getByLabel('Share link');
  await expect(link).toBeVisible();
  const value = await link.inputValue();
  expect(value).toContain('#/share/');
  return value;
}

test('P8 share links open as verified read-only mathematical snapshots', async ({ page }) => {
  const link = await createShareLink(page);
  const hash = new URL(link).hash;
  await page.goto('/' + hash);

  await expect(page.getByRole('heading', { name: 'Shared quadratic model' })).toBeVisible();
  await expect(page.getByText('Review the model before making your own copy.')).toBeVisible();
  await expect(page.getByText('SHA-256 verified')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Shared mathematical objects' })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Mathematical input' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Copy into my MathLab' })).toBeVisible();
});

test('P8 shared copy is explicit and the previous local workspace remains recoverable', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop', 'Recovery-copy acceptance runs once; the shared read-only flow runs across the full browser/device matrix.');

  const link = await createShareLink(page);

  await commit(page, 'local_only := 9');
  await expect(page.getByText('Saved locally')).toBeVisible();
  await page.waitForTimeout(260);

  await page.goto('/' + new URL(link).hash);
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Copy into my MathLab' }).click();
  await expect(page).toHaveURL(/#\/workspace$/);

  const sidebar = page.locator('.object-sidebar');
  await expect(sidebar).toContainText('a');
  await expect(sidebar).not.toContainText('local_only');
  await expect(page.getByText('Saved locally')).toBeVisible();
  await page.waitForTimeout(260);

  await page.getByText('Workspace data').click();
  await page.getByRole('button', { name: 'Restore recovery' }).click();
  await expect(sidebar).toContainText('local_only');
});
