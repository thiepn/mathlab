import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

const routes = ['workspace', 'tools', 'visualize', 'proof', 'practice', 'reference'] as const;
const touchProjects = new Set(['android-chromium', 'ios-webkit', 'android-tablet-chromium', 'ipad-webkit']);

async function openWorkspace(page: Page) {
  await page.goto('/#/workspace');
  await expect(page).toHaveTitle('Workspace · MathLab');
  await expect(page.locator('.save-state')).toHaveText('Saved locally');
  await expect(page.getByRole('textbox', { name: 'Mathematical input' })).toBeVisible();
}

async function expectNoPageOverflow(page: Page, context: string) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow, context).toBeLessThanOrEqual(1);
}

test('primary routes have no automated WCAG A/AA violations', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop', 'Axe runs once on the canonical DOM; engine/device behavior is certified separately.');

  for (const route of routes) {
    await page.goto(`/#/${route}`);
    await expect(page.locator('#mathlab-main')).toBeVisible();
    const result = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
      .analyze();
    expect(result.violations, `${route} axe violations:\n${JSON.stringify(result.violations, null, 2)}`).toEqual([]);
  }
});

test('keyboard focus starts with the skip link and exposes a visible focus indicator', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop', 'Keyboard focus certification runs on the desktop interaction model.');
  await openWorkspace(page);

  await page.keyboard.press('Tab');
  const skip = page.getByRole('link', { name: 'Skip to main content' });
  await expect(skip).toBeFocused();
  await expect(skip).toBeVisible();

  const outline = await skip.evaluate((element) => {
    const style = getComputedStyle(element);
    return { width: Number.parseFloat(style.outlineWidth), style: style.outlineStyle };
  });
  expect(outline.width).toBeGreaterThanOrEqual(2);
  expect(outline.style).not.toBe('none');

  await page.keyboard.press('Enter');
  await expect(page.locator('#mathlab-main')).toBeFocused();
});

test('320px viewport with 200% text reflows without page-level horizontal scrolling', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop', 'Canonical WCAG reflow/text-resize check runs once in Chromium.');
  await page.setViewportSize({ width: 320, height: 720 });
  await openWorkspace(page);
  await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
  await expect(page.getByRole('textbox', { name: 'Mathematical input' })).toBeVisible();
  await expectNoPageOverflow(page, 'horizontal overflow at 320px with 200% root text size');
});

test('reduced-motion preference disables smooth scrolling and long animation/transition timing', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop', 'Media-preference behavior is deterministic in Chromium.');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openWorkspace(page);

  expect(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches)).toBe(true);
  const values = await page.evaluate(() => {
    const html = getComputedStyle(document.documentElement);
    const button = document.querySelector('button');
    if (!button) throw new Error('Expected at least one button.');
    const style = getComputedStyle(button);
    return {
      scrollBehavior: html.scrollBehavior,
      animationDuration: style.animationDuration,
      transitionDuration: style.transitionDuration,
    };
  });
  expect(values.scrollBehavior).toBe('auto');
  expect(values.animationDuration).toMatch(/0\.0+1ms|0s/);
  expect(values.transitionDuration).toMatch(/0\.0+1ms|0s/);
});

test('forced-colors mode retains visible keyboard focus and usable core controls', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop', 'Forced-colors emulation is certified in Chromium.');
  await page.emulateMedia({ forcedColors: 'active' });
  await openWorkspace(page);
  expect(await page.evaluate(() => matchMedia('(forced-colors: active)').matches)).toBe(true);

  const input = page.getByRole('textbox', { name: 'Mathematical input' });
  await input.focus();
  const outline = await input.evaluate((element) => {
    const style = getComputedStyle(element);
    return { width: Number.parseFloat(style.outlineWidth), style: style.outlineStyle };
  });
  expect(outline.width).toBeGreaterThanOrEqual(2);
  expect(outline.style).not.toBe('none');
  await expect(page.getByRole('button', { name: /Commit/ })).toBeVisible();
});

test('touch phone and tablet projects remain usable in portrait and landscape', async ({ page }, testInfo) => {
  test.skip(!touchProjects.has(testInfo.project.name), 'Orientation/touch layout certification only applies to phone/tablet emulation projects.');
  await openWorkspace(page);
  const portrait = page.viewportSize();
  if (!portrait) throw new Error('Touch project must expose a viewport.');

  await expectNoPageOverflow(page, `${testInfo.project.name} portrait overflow`);
  await expect(page.getByRole('button', { name: /Commit/ })).toBeVisible();

  await page.setViewportSize({ width: portrait.height, height: portrait.width });
  await page.reload();
  await expect(page.locator('.save-state')).toHaveText('Saved locally');
  await expect(page.getByRole('textbox', { name: 'Mathematical input' })).toBeVisible();
  await expect(page.getByRole('button', { name: /Commit/ })).toBeVisible();
  await expectNoPageOverflow(page, `${testInfo.project.name} landscape overflow`);
});

test('primary touch controls meet the WCAG 2.2 24px minimum target size', async ({ page }, testInfo) => {
  test.skip(!touchProjects.has(testInfo.project.name), 'Target-size certification only applies to touch projects.');
  await openWorkspace(page);

  const targets = [page.getByRole('button', { name: /Commit/ })];
  const mobileNav = page.getByRole('navigation', { name: 'Mobile primary navigation' });
  if (await mobileNav.isVisible()) targets.push(mobileNav.getByRole('button', { name: 'Tools', exact: true }));

  for (const target of targets) {
    const box = await target.boundingBox();
    expect(box, 'touch target must have a rendered box').not.toBeNull();
    expect(box!.width, 'touch target width').toBeGreaterThanOrEqual(24);
    expect(box!.height, 'touch target height').toBeGreaterThanOrEqual(24);
  }
});

test('PWA metadata and service-worker registration satisfy the installability source contract', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop', 'One deterministic PWA source-contract check is sufficient.');
  await openWorkspace(page);

  const manifestHref = await page.locator('link[rel="manifest"]').getAttribute('href');
  expect(manifestHref).toBeTruthy();
  const manifestResponse = await page.request.get(new URL(manifestHref!, page.url()).toString());
  expect(manifestResponse.ok()).toBe(true);
  const manifest = await manifestResponse.json();
  expect(manifest).toMatchObject({ name: 'MathLab', short_name: 'MathLab', display: 'standalone', start_url: './', scope: './' });
  expect(manifest.icons).toEqual(expect.arrayContaining([
    expect.objectContaining({ sizes: '192x192', purpose: 'any' }),
    expect.objectContaining({ sizes: '512x512', purpose: 'any' }),
    expect.objectContaining({ sizes: '512x512', purpose: 'maskable' }),
  ]));

  const registration = await page.evaluate(async () => {
    if (!('serviceWorker' in navigator)) return null;
    const ready = await navigator.serviceWorker.ready;
    return { scope: ready.scope, hasActiveWorker: Boolean(ready.active) };
  });
  expect(registration).not.toBeNull();
  expect(registration!.hasActiveWorker).toBe(true);
  expect(registration!.scope).toContain('127.0.0.1:4173/');
});
