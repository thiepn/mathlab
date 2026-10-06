import { expect, test, type Page } from '@playwright/test';

const runtime = globalThis as typeof globalThis & { process?: { env?: Record<string, string | undefined> } };
const productionURL = new URL(runtime.process?.env?.MATHLAB_PRODUCTION_URL ?? 'https://thiepn.dev/mathlab/');
const routes = ['workspace', 'tools', 'visualize', 'proof', 'practice', 'reference'] as const;

function routeURL(route: string) {
  return new URL(`./#/${route}`, productionURL).toString();
}

async function openWorkspace(page: Page) {
  await page.goto(routeURL('workspace'), { waitUntil: 'domcontentloaded' });
  await expect(page).toHaveTitle('Work · MathLab');
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

test('live structured input and piecewise preview work', async ({ page }) => {
  await openWorkspace(page);
  const input = page.getByRole('textbox', { name: 'Mathematical input' });

  await page.getByRole('button', { name: 'Math keypad', exact: true }).click();
  const keypad = page.getByRole('region', { name: 'Math keypad' });
  await expect(keypad).toBeVisible();
  await keypad.getByRole('tab', { name: 'Structure' }).click();
  await keypad.getByRole('button', { name: /Piecewise function/ }).click();

  await expect(input).toHaveValue('f(x) := piecewise(x^2, x < 0; 2x + 1, x >= 0)');
  await expect(page.locator('.live-preview-panel math')).toBeVisible();
  await page.getByRole('button', { name: /Commit/ }).click();
  await expect(page.getByText(/Piecewise mathematics is first-class input/)).toBeVisible();
});

test('live unified capability registry keeps Tools and Reference search aligned', async ({ page }) => {
  await page.goto(routeURL('tools'), { waitUntil: 'domcontentloaded' });
  const toolsSearch = page.getByRole('textbox', { name: 'Search tools' });
  await toolsSearch.fill('spectrum');
  await expect(page.getByRole('button', { name: /Eigenvalues/ }).first()).toBeVisible();

  await page.goto(routeURL('reference'), { waitUntil: 'domcontentloaded' });
  const referenceSearch = page.getByRole('textbox', { name: 'Search mathematical reference' });
  await referenceSearch.fill('spectrum');
  await expect(page.getByText('Eigenvalues', { exact: true }).first()).toBeVisible();
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

test('live worksheet persists across a production reload', async ({ page }) => {
  await openWorkspace(page);
  await expect(page.locator('.worksheet-save')).toHaveText('Saved');

  const input = page.getByRole('textbox', { name: 'Mathematical input' });
  await input.fill('production_worksheet_probe := 7');
  await page.getByRole('button', { name: /Commit/ }).click();
  await expect(page.locator('.worksheet-entry-input')).toHaveCount(1);
  await expect(page.locator('.worksheet-save')).toHaveText('Saved');

  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('region', { name: 'Mathematical worksheet' })).toBeVisible();
  await expect(page.locator('.worksheet-entry-input')).toContainText('production_worksheet_probe');
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

  // Reload only after MathLab itself reports that the asynchronous persistence
  // protocol is complete. This matches the stable release contract and still
  // verifies the real IndexedDB record independently above.
  await expect(page.locator('.save-state')).toHaveText('Saved locally');
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
    await expect(page).toHaveTitle('Work · MathLab');
    await expect(page.locator('.release-badge')).toHaveText('v2.0');
    await expect(page.getByRole('textbox', { name: 'Mathematical input' })).toBeVisible();
  } finally {
    await context.setOffline(false);
  }
});