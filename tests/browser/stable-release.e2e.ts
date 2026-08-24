import { expect, test } from '@playwright/test';

const routes = [
  ['workspace', 'Workspace'],
  ['tools', 'Tools'],
  ['visualize', 'Visualize'],
  ['proof', 'Proof Lab'],
  ['practice', 'Practice'],
  ['reference', 'Reference'],
] as const;

async function openWorkspace(page: Parameters<typeof test>[0] extends never ? never : any) {
  await page.goto('/#/workspace');
  await expect(page).toHaveTitle('Workspace · MathLab');
  await expect(page.getByRole('heading', { name: /What do you want to work out\?|Working on/ })).toBeVisible();
}

test('boots cleanly and every primary route is reachable', async ({ page }) => {
  const pageErrors: string[] = [];
  const consoleErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });

  await openWorkspace(page);
  await expect(page.getByText('v2.0 RC1', { exact: true })).toBeVisible();

  for (const [route, label] of routes) {
    await page.goto(`/#/${route}`);
    await expect(page).toHaveTitle(`${label} · MathLab`);
    await expect(page.locator('#mathlab-main')).toBeVisible();
  }

  expect(pageErrors).toEqual([]);
  expect(consoleErrors).toEqual([]);
});

test('visible navigation works at desktop and mobile widths without horizontal page overflow', async ({ page }) => {
  await openWorkspace(page);
  const mobileNav = page.getByRole('navigation', { name: 'Mobile primary navigation' });
  if (await mobileNav.isVisible()) {
    await mobileNav.getByRole('button', { name: 'Tools', exact: true }).click();
  } else {
    await page.getByRole('navigation', { name: 'Primary navigation' }).getByRole('button', { name: 'Tools', exact: true }).click();
  }
  await expect(page).toHaveTitle('Tools · MathLab');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});

test('command palette opens from the keyboard, filters tools, closes, and restores focus', async ({ page }) => {
  await openWorkspace(page);
  const searchButton = page.getByRole('button', { name: 'Search mathematical tools and workspace' });
  await searchButton.focus();
  await page.keyboard.press('Control+K');

  const dialog = page.getByRole('dialog', { name: 'Search MathLab' });
  await expect(dialog).toBeVisible();
  const input = dialog.getByPlaceholder(/Search ANOVA/);
  await expect(input).toBeFocused();
  await input.fill('ANOVA');
  await expect(dialog.getByText(/ANOVA/i).first()).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(searchButton).toBeFocused();
});

test('workspace commits mathematics and executes the Worker engine', async ({ page }) => {
  await openWorkspace(page);
  const input = page.getByRole('textbox', { name: 'Mathematical input' });
  await input.fill('x^2-1');
  await page.getByRole('button', { name: /Commit/ }).click();
  await expect(page.getByText('Working expression ready. Anonymous work stays temporary.')).toBeVisible();

  await page.getByRole('button', { name: /^Factor/ }).click();
  const result = page.locator('#mathlab-result');
  await expect(result).toBeVisible();
  await expect(result.getByText('EXACT', { exact: true })).toBeVisible();
  await expect(result.locator('.engine-error')).toHaveCount(0);
});

test('IndexedDB workspace state survives a browser reload', async ({ page }) => {
  await openWorkspace(page);
  const input = page.getByRole('textbox', { name: 'Mathematical input' });
  await input.fill('stable_probe := 2');
  await page.getByRole('button', { name: /Commit/ }).click();
  await expect(page.getByText(/Saved stable_probe to the workspace\.|Updated stable_probe\./)).toBeVisible();
  await expect(page.getByText('Saved locally')).toBeVisible();

  await page.reload();
  await expect(page.getByRole('heading', { name: 'Working on stable_probe' })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Mathematical input' })).toHaveValue('stable_probe := 2');
});

test('installed service worker supports an offline application reload', async ({ page, context }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop', 'One deterministic service-worker/offline certification is sufficient; engine coverage runs on every project.');
  await openWorkspace(page);
  await page.evaluate(async () => {
    if (!('serviceWorker' in navigator)) throw new Error('Service workers unavailable');
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await expect(page).toHaveTitle('Workspace · MathLab');

  await context.setOffline(true);
  try {
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page).toHaveTitle('Workspace · MathLab');
    await expect(page.getByText('Offline', { exact: true })).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'Mathematical input' })).toBeVisible();
  } finally {
    await context.setOffline(false);
  }
});
