/**
 * D0 visual inventory. Capture the exact commit under review from a local
 * production build, never from a mocked or disconnected design prototype.
 *
 * Run after "npm run build" and "npx playwright install chromium".
 * Outputs PNGs and a machine-readable manifest to d0-captures/.
 */
import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const ROOT = process.env.D0_CAPTURE_OUTPUT || 'd0-captures';
const BASE = 'http://127.0.0.1:4173';
const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900, deviceScaleFactor: 1, isMobile: false, hasTouch: false },
  { name: 'tablet', width: 834, height: 1194, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  { name: 'phone', width: 390, height: 844, deviceScaleFactor: 3, isMobile: true, hasTouch: true },
];
const ROUTES = ['workspace', 'visualize', 'tools', 'proof', 'practice', 'reference', 'share'];
const server = spawn('npm', ['run', 'preview', '--', '--host', '127.0.0.1', '--port', '4173', '--strictPort'], { stdio: 'inherit' });
let browser;
const report = { commit: process.env.GITHUB_SHA || process.env.D0_GIT_SHA || 'local-build', createdAt: new Date().toISOString(), baseURL: BASE, captures: [], errors: [] };

async function waitForServer() {
  for (let i = 0; i < 100; i++) {
    if (server.exitCode !== null) throw new Error('Preview server exited unexpectedly');
    try { const response = await fetch(BASE); if (response.ok) return; } catch { /* starting */ }
    await new Promise(resolve => setTimeout(resolve, 300));
  }
  throw new Error('Vite preview did not become available');
}

async function shot(page, device, name) {
  await page.evaluate(async () => { await document.fonts.ready; });
  const path = join(ROOT, device, name + '.png');
  await page.screenshot({ path, fullPage: true, animations: 'disabled' });
  const measurement = await page.evaluate(() => ({
    title: document.title,
    documentWidth: document.documentElement.scrollWidth,
    viewportWidth: window.innerWidth,
    scrollHeight: document.documentElement.scrollHeight,
    visibleH1s: [...document.querySelectorAll('h1')].map(node => node.textContent?.trim() || ''),
  }));
  report.captures.push({ device, state: name, path, ...measurement, horizontalOverflow: measurement.documentWidth > measurement.viewportWidth + 1 });
}
async function optional(page, device, name, action) {
  try { await action(); await shot(page, device, name); }
  catch (error) { report.errors.push({ device, state: name, message: String(error) }); }
}
async function commit(page, source, objectName) {
  const input = page.getByRole('textbox', { name: 'Mathematical input' });
  await input.fill(source);
  await page.getByRole('button', { name: /Commit/ }).click();
  await page.getByText(new RegExp('(?:Saved|Updated) ' + objectName + '(?: to the workspace\\.|\\.)')).waitFor({ timeout: 12000 });
}
try {
  await mkdir(ROOT, { recursive: true });
  await waitForServer();
  browser = await chromium.launch({ headless: true });

  for (const device of VIEWPORTS) {
    await mkdir(join(ROOT, device.name), { recursive: true });
    const context = await browser.newContext({
      viewport: { width: device.width, height: device.height },
      deviceScaleFactor: device.deviceScaleFactor,
      isMobile: device.isMobile,
      hasTouch: device.hasTouch,
      reducedMotion: 'reduce',
    });
    const page = await context.newPage();
    await page.goto(BASE + '/#/workspace', { waitUntil: 'domcontentloaded' });
    await page.getByRole('textbox', { name: 'Mathematical input' }).waitFor();
    await shot(page, device.name, '01-workspace-empty');

    await commit(page, 'a := 2', 'a');
    await commit(page, 'f(x) := a*x^2+1', 'f');
    await shot(page, device.name, '02-workspace-saved-function');

    for (let i = 1; i < ROUTES.length; i++) {
      const route = ROUTES[i];
      await page.goto(BASE + '/#/' + route, { waitUntil: 'domcontentloaded' });
      await page.locator('#mathlab-main').waitFor();
      // Lazy routes use Suspense; allow the real content to replace the spinner.
      await page.locator('.p9-route-loading').waitFor({ state: 'hidden', timeout: 12000 }).catch(() => {});
      await shot(page, device.name, 'route-' + route);
    }

    await page.goto(BASE + '/#/visualize');
    await optional(page, device.name, 'visualize-dynamic', async () => {
      await page.getByRole('region', { name: 'Dynamic exploration' }).waitFor({ timeout: 10000 });
      const slider = page.getByRole('slider', { name: 'a slider' });
      await slider.waitFor({ timeout: 4000 });
      await slider.fill('3');
    });

    await page.goto(BASE + '/#/workspace');
    await optional(page, device.name, 'workspace-keypad', async () => {
      await page.getByRole('button', { name: 'Math keypad' }).click();
      await page.getByRole('region', { name: 'Math keypad' }).waitFor({ timeout: 4000 });
    });

    await context.close();
  }
} catch (error) {
  report.errors.push({ fatal: true, message: error instanceof Error ? error.stack : String(error) });
  process.exitCode = 1;
} finally {
  if (browser) await browser.close();
  server.kill('SIGTERM');
  await writeFile(join(ROOT, 'manifest.json'), JSON.stringify(report, null, 2));
  console.log('D0 capture report:', report.captures.length, 'screenshots;', report.errors.length, 'optional/fatal errors.');
}
