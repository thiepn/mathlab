import { expect, test } from '@playwright/test';

test('P9 heavy product modules load on demand instead of with the initial workspace shell', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop', 'One deterministic module-loading trace is sufficient.');

  const scripts: string[] = [];
  page.on('response', (response) => {
    const url = response.url();
    if (/\.js(?:\?|$)/.test(url)) scripts.push(url);
  });

  await page.goto('/#/workspace');
  await expect(page.getByRole('textbox', { name: 'Mathematical input' })).toBeVisible();
  await page.waitForLoadState('networkidle');
  const workspaceScripts = new Set(scripts);
  expect(workspaceScripts.size).toBeGreaterThan(0);

  await page.goto('/#/visualize');
  await expect(page.locator('.e3-page').first()).toBeVisible();
  await page.waitForLoadState('networkidle');
  const afterVisualize = new Set(scripts);
  expect(afterVisualize.size).toBeGreaterThan(workspaceScripts.size);

  await page.goto('/#/practice');
  await expect(page.locator('.m6-practice-page').first()).toBeVisible();
  await page.waitForLoadState('networkidle');
  const afterPractice = new Set(scripts);
  expect(afterPractice.size).toBeGreaterThan(afterVisualize.size);
});

test('P9 storage health is inspectable without interrupting workspace persistence', async ({ page }) => {
  await page.goto('/#/workspace');
  await expect(page.locator('.save-state')).toHaveText('Saved locally');

  const dataMenu = page.locator('details.workspace-data-menu');
  await page.getByText('Workspace data', { exact: true }).click();
  const health = page.locator('.p9-storage-health');
  await expect(health).toBeVisible();
  await expect(health).toContainText(/IndexedDB ready|Local storage unavailable/);
  await page.getByText('Workspace data', { exact: true }).click();
  await expect(dataMenu).not.toHaveAttribute('open', '');

  const input = page.getByRole('textbox', { name: 'Mathematical input' });
  await input.fill('p9_storage_probe := 11');
  await page.getByRole('button', { name: /Commit/ }).click();
  await expect(page.locator('.save-state')).toHaveText('Saved locally');
});

test('P9 service worker uses a build-scoped registration and cache generation', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop', 'One deterministic PWA generation check is sufficient.');

  await page.goto('/#/workspace');
  await page.evaluate(async () => {
    if (!('serviceWorker' in navigator)) throw new Error('Service workers unavailable');
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await expect(page.getByRole('textbox', { name: 'Mathematical input' })).toBeVisible();

  const state = await page.evaluate(async () => {
    const ready = await navigator.serviceWorker.ready;
    return {
      scriptURL: ready.active?.scriptURL ?? '',
      cacheKeys: await caches.keys(),
    };
  });

  expect(state.scriptURL).toMatch(/\/sw\.js\?v=[^&#]+$/);
  expect(state.cacheKeys.some((key) => /^mathlab-build-.+-shell$/.test(key))).toBe(true);
  expect(state.cacheKeys.some((key) => /^mathlab-build-.+-runtime$/.test(key))).toBe(true);
  expect(state.cacheKeys.some((key) => /^mathlab-v2-/.test(key))).toBe(false);
});

test('P9 published release identity corresponds to the exact production build', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop', 'Release asset is shared across all browser engines.');
  const response = await page.request.get('/release.json');
  expect(response.ok()).toBe(true);
  const identity = await response.json();
  const runtime = globalThis as typeof globalThis & { process?: { env?: Record<string, string | undefined> } };
  const sha = runtime.process?.env?.GITHUB_SHA ?? '';
  if (/^[a-f0-9]{40}$/.test(sha)) {
    expect(identity).toEqual({ schema: 'mathlab-release-v1', commit: sha, buildId: sha.slice(0, 12) });
  } else {
    expect(identity).toEqual({
      schema: 'mathlab-release-v1',
      commit: null,
      buildId: runtime.process?.env?.MATHLAB_BUILD_ID || 'local-v2.1.0',
    });
  }
});
