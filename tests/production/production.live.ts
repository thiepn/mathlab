import { expect, test, type Page } from '@playwright/test';

const productionURL = new URL(process.env.MATHLAB_PRODUCTION_URL ?? 'https://thiepn.dev/mathlab/');
const routes = ['workspace', 'tools', 'visualize', 'proof', 'practice', 'reference'] as const;

function routeURL(route: string) {
  return new URL(`./#/${route}`, productionURL).toString();
}

async function openWorkspace(page: Page) {
  await page.goto(routeURL('workspace'), { waitUntil: 'domcontentloaded' });
  await expect(page).toHaveTitle('Workspace · MathLab');
  await expect(page.locator('.release-badge')).toHaveText('v2.0');
  await expect(page.locator('.save-state')).toHaveText('Saved locally');
  await expect(page.getByRole('textbox', { name: 'Mathematical input' })).toBeVisible();
}

test('custom-domain stable build boots and every primary route resolves', async ({ page }) => {
  const pageErrors: string[] = [];
  const consoleErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });

  await openWorkspace(page);
  for (const route of routes) {
    await page.goto(routeURL(route), { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#mathlab-main')).toBeVisible();
    await expect(page.locator('.release-badge')).toHaveText('v2.0');
  }

  expect(pageErrors).toEqual([]);
  expect(consoleErrors).toEqual([]);
});

test('production manifest, icons and v2 service worker are published', async ({ page }) => {
  await openWorkspace(page);

  const manifestResponse = await page.request.get(new URL('manifest.webmanifest', productionURL).toString());
  expect(manifestResponse.ok()).toBe(true);
  const manifest = await manifestResponse.json();
  expect(manifest.name).toBe('MathLab');
  expect(manifest.short_name).toBe('MathLab');
  expect(manifest.display).toBe('standalone');
  expect(manifest.start_url).toBe('./');
  expect(manifest.scope).toBe('./');
  expect(manifest.icons).toEqual(expect.arrayContaining([
    expect.objectContaining({ src: './mathlab-icon-192.png', sizes: '192x192' }),
    expect.objectContaining({ src: './mathlab-icon-512.png', sizes: '512x512' }),
    expect.objectContaining({ src: './mathlab-maskable-512.png', sizes: '512x512', purpose: 'maskable' }),
  ]));

  const swResponse = await page.request.get(new URL('sw.js', productionURL).toString());
  expect(swResponse.ok()).toBe(true);
  const sw = await swResponse.text();
  expect(sw).toContain("const SHELL_CACHE = 'mathlab-v2-shell'");
  expect(sw).toContain("const RUNTIME_CACHE = 'mathlab-v2-runtime'");

  for (const icon of ['mathlab-icon-192.png', 'mathlab-icon-512.png', 'mathlab-maskable-512.png']) {
    const response = await page.request.get(new URL(icon, productionURL).toString());
    expect(response.ok(), `${icon} should be published`).toBe(true);
    expect((await response.body()).byteLength, `${icon} should not be empty`).toBeGreaterThan(1000);
  }
});

test('live Worker-backed mathematics executes with exact provenance', async ({ page }) => {
  await openWorkspace(page);
  const input = page.getByRole('textbox', { name: 'Mathematical input' });
  await input.fill('x^2-1');
  await page.getByRole('button', { name: /Commit/ }).click();
  await expect(page.getByText('Working expression ready. Anonymous work stays temporary.')).toBeVisible();
  await page.getByRole('button', { name: /^Factor/ }).click();

  const result = page.locator('#mathlab-result');
  await expect(result).toBeVisible({ timeout: 20_000 });
  await expect(result.locator('.engine-error')).toHaveCount(0);
  await expect(result.getByText('EXACT', { exact: true })).toBeVisible();
});

test('live IndexedDB workspace persists across a production reload', async ({ page }) => {
  await openWorkspace(page);
  const input = page.getByRole('textbox', { name: 'Mathematical input' });
  await input.fill('production_probe := 2');
  await page.getByRole('button', { name: /Commit/ }).click();
  await expect(page.getByText(/Saved production_probe to the workspace\.|Updated production_probe\./)).toBeVisible();

  await page.waitForFunction(async () => {
    try {
      const record = await new Promise<Record<string, unknown> | null>((resolve) => {
        const open = indexedDB.open('mathlab', 1);
        open.onerror = () => resolve(null);
        open.onblocked = () => resolve(null);
        open.onsuccess = () => {
          const db = open.result;
          try {
            const tx = db.transaction('records', 'readonly');
            const request = tx.objectStore('records').get('workspace:p15:default');
            request.onerror = () => { db.close(); resolve(null); };
            request.onsuccess = () => { db.close(); resolve(request.result as Record<string, unknown> | null); };
          } catch {
            db.close();
            resolve(null);
          }
        };
      });
      const value = record?.value as { objects?: Array<{ name?: string; source?: string }> } | undefined;
      return Boolean(value?.objects?.some((object) => object.name === 'production_probe' && object.source === 'production_probe := 2'));
    } catch {
      return false;
    }
  }, undefined, { timeout: 20_000 });

  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.locator('.save-state')).toHaveText('Saved locally');
  await expect(page.getByRole('heading', { name: 'Working on production_probe' })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Mathematical input' })).toHaveValue('production_probe := 2');
});

test('production layout has no page-level horizontal overflow', async ({ page }) => {
  await openWorkspace(page);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});

test('deployed service worker supports an offline reload', async ({ page, context }, testInfo) => {
  test.skip(testInfo.project.name !== 'production-chromium', 'Offline production reload is certified once in Chromium; the mobile production project covers the deployed touch layout.');
  await openWorkspace(page);
  await page.evaluate(async () => {
    if (!('serviceWorker' in navigator)) throw new Error('Service workers unavailable');
    await navigator.serviceWorker.ready;
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.locator('.release-badge')).toHaveText('v2.0');

  await context.setOffline(true);
  try {
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page).toHaveTitle('Workspace · MathLab');
    await expect(page.locator('.release-badge')).toHaveText('v2.0');
    await expect(page.getByRole('textbox', { name: 'Mathematical input' })).toBeVisible();
  } finally {
    await context.setOffline(false);
  }
});
