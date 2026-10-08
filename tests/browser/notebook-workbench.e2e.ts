import { expect, test } from '@playwright/test';

test('notebook workbench keeps editing and typesetting in one responsive surface', async ({ page }, testInfo) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await page.goto('/');
  await expect(page.locator('.math-entry-composition')).toBeVisible();
  const editor = page.locator('.math-entry-editor');
  const preview = page.locator('.math-entry-composition > .live-preview-panel');
  await expect(editor).toBeVisible();
  await expect(preview).toBeVisible();

  const editorRect = await editor.boundingBox();
  const previewRect = await preview.boundingBox();
  expect(editorRect).not.toBeNull();
  expect(previewRect).not.toBeNull();

  if (testInfo.project.use.viewport?.width && testInfo.project.use.viewport.width > 1180) {
    // Desktop is a side-by-side workbench, not unrelated stacked cards.
    expect(previewRect!.x).toBeGreaterThan(editorRect!.x + editorRect!.width - 2);
    expect(Math.abs(previewRect!.y - editorRect!.y)).toBeLessThan(3);
  } else {
    // Phones and tablets keep the input first in document/visual order.
    expect(previewRect!.y).toBeGreaterThan(editorRect!.y + editorRect!.height - 2);
  }

  const input = page.getByRole('textbox', { name: 'Mathematical input' });
  await input.fill('x^2 + 1');
  await expect(preview.locator('math')).toBeVisible();

  // A visual pass must not come at the cost of touch reflow or math parsing.
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  expect(pageErrors).toEqual([]);
});
