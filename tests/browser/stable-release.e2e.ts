import { expect, test, type Page } from '@playwright/test';

const routes = [
  ['workspace', 'Work'],
  ['tools', 'Tools'],
  ['visualize', 'Visualize'],
  ['proof', 'Proof & Verification'],
  ['practice', 'Learn'],
  ['reference', 'Reference'],
  ['share', 'Shared snapshot'],
] as const;

async function openWorkspace(page: Page) {
  await page.goto('/#/workspace');
  await expect(page).toHaveTitle('Work · MathLab');
  await expect(page.locator('.workspace-main h1')).toBeVisible();
  await expect(page.locator('.save-state')).toHaveText('Saved locally');
}

function isMobileProject(name: string) {
  return name === 'android-chromium'
    || name === 'ios-webkit'
    || name === 'android-tablet-chromium'
    || name === 'ipad-webkit';
}

test('boots cleanly and every routed surface is reachable', async ({ page }) => {
  const pageErrors: string[] = [];
  const consoleErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });

  await openWorkspace(page);
  await expect(page.locator('.release-badge')).toHaveText('v2.1');

  for (const [route, label] of routes) {
    await page.goto(`/#/${route}`);
    await expect(page).toHaveTitle(`${label} · MathLab`);
    await expect(page.locator('#mathlab-main')).toBeVisible();
  }

  expect(pageErrors).toEqual([]);
  expect(consoleErrors).toEqual([]);
});

test('consolidated primary and contextual navigation works without page overflow', async ({ page }) => {
  await openWorkspace(page);

  const desktopNav = page.getByRole('navigation', { name: 'Primary navigation' });
  if (await desktopNav.isVisible()) {
    await expect(desktopNav.getByRole('button')).toHaveCount(3);
    await expect(desktopNav.getByRole('button', { name: 'Work', exact: true })).toHaveAttribute('aria-current', 'location');
    await expect(desktopNav.getByRole('button', { name: 'Visualize', exact: true })).toBeVisible();
    await expect(desktopNav.getByRole('button', { name: 'Learn', exact: true })).toBeVisible();
  } else {
    const mobileNav = page.getByRole('navigation', { name: 'Mobile primary navigation' });
    await expect(mobileNav.getByRole('button')).toHaveCount(3);
    await expect(mobileNav.getByRole('button', { name: 'Work', exact: true })).toHaveAttribute('aria-current', 'location');
  }

  const workNav = page.getByRole('navigation', { name: 'Work section navigation' });
  await expect(workNav.getByRole('button')).toHaveCount(3);
  await workNav.getByRole('button', { name: 'Tools', exact: true }).click();
  await expect(page).toHaveTitle('Tools · MathLab');
  await expect(workNav.getByRole('button', { name: 'Tools', exact: true })).toHaveAttribute('aria-current', 'page');

  const primary = (await desktopNav.isVisible()) ? desktopNav : page.getByRole('navigation', { name: 'Mobile primary navigation' });
  await primary.getByRole('button', { name: 'Learn', exact: true }).click();
  await expect(page).toHaveTitle('Learn · MathLab');

  const learnNav = page.getByRole('navigation', { name: 'Learn section navigation' });
  await expect(learnNav.getByRole('button')).toHaveCount(2);
  await learnNav.getByRole('button', { name: 'Reference', exact: true }).click();
  await expect(page).toHaveTitle('Reference · MathLab');

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});

test('standard release widths remain structurally responsive', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop', 'Canonical width sweep runs once in Chromium; mobile engine projects cover touch layouts.');
  for (const width of [320, 375, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: width < 800 ? 844 : 900 });
    await openWorkspace(page);
    await expect(page.getByRole('textbox', { name: 'Mathematical input' })).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, `horizontal overflow at ${width}px`).toBeLessThanOrEqual(1);
  }
});

test('command palette opens from the keyboard, filters tools, closes, and restores focus', async ({ page }, testInfo) => {
  test.skip(isMobileProject(testInfo.project.name), 'Keyboard shortcut/focus restoration is a desktop interaction; mobile discovery is covered through touch navigation.');
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

test('unified capability registry keeps Workspace, Tools, Search, Reference and Practice aligned', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop', 'One deterministic cross-surface registry parity pass is sufficient.');

  await openWorkspace(page);
  const mathInput = page.getByRole('textbox', { name: 'Mathematical input' });
  await mathInput.fill('f(x) := x^2 + 1');
  await page.getByRole('button', { name: /Commit/ }).click();
  await expect(page.getByRole('button', { name: /^Derivative/ }).first()).toBeVisible();

  await page.goto('/#/tools');
  const toolSearch = page.getByRole('textbox', { name: 'Search tools' });
  await toolSearch.fill('spectrum');
  await expect(page.getByRole('button', { name: /Eigenvalues/ }).first()).toBeVisible();

  await page.keyboard.press('Control+K');
  const command = page.getByRole('dialog', { name: 'Search MathLab' });
  await command.getByPlaceholder(/Search ANOVA/).fill('spectrum');
  await expect(command.getByRole('button', { name: /Eigenvalues/ })).toBeVisible();
  await page.keyboard.press('Escape');

  await page.goto('/#/reference');
  const referenceSearch = page.getByRole('textbox', { name: 'Search mathematical reference' });
  await referenceSearch.fill('spectrum');
  await expect(page.getByText('Eigenvalues', { exact: true }).first()).toBeVisible();

  await page.goto('/#/practice');
  await page.getByRole('button', { name: /Functions & Calculus/ }).click();
  await expect(page.getByText(/engine tools/)).toBeVisible();
  await expect(page.getByRole('button', { name: /Browse \d+ tools/ })).toBeVisible();
});

test('skip link and primary mathematical input expose keyboard-accessible semantics', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop', 'One deterministic keyboard semantics pass is sufficient; this is not claimed as a screen-reader certification.');
  await openWorkspace(page);
  const skip = page.getByRole('link', { name: 'Skip to main content' });
  await skip.focus();
  await expect(skip).toBeVisible();
  await page.keyboard.press('Enter');
  await expect(page.locator('#mathlab-main')).toBeFocused();
  await expect(page.getByRole('textbox', { name: 'Mathematical input' })).toBeVisible();
});

test('structured input wraps selections and keyboard shortcuts preserve fast entry', async ({ page }) => {
  await openWorkspace(page);
  const input = page.getByRole('textbox', { name: 'Mathematical input' });

  await input.fill('x+1');
  await input.selectText();
  await page.getByRole('button', { name: 'Math keypad', exact: true }).click();
  const keypad = page.getByRole('region', { name: 'Math keypad' });
  await expect(keypad).toBeVisible();
  await keypad.getByRole('button', { name: /Square root/ }).click();
  await expect(input).toHaveValue('sqrt(x+1)');

  await input.fill('x+1');
  await input.selectText();
  await page.keyboard.press('(');
  await expect(input).toHaveValue('(x+1)');

  await input.fill('x^2+1');
  await page.keyboard.press('Control+Enter');
  await expect(page.locator('.worksheet-entry-input')).toHaveCount(1);
});

test('piecewise template commits as a function with deliberately bounded capabilities', async ({ page }) => {
  await openWorkspace(page);
  const input = page.getByRole('textbox', { name: 'Mathematical input' });
  await page.getByRole('button', { name: 'Math keypad', exact: true }).click();
  const keypad = page.getByRole('region', { name: 'Math keypad' });
  await keypad.getByRole('tab', { name: 'Structure' }).click();
  await keypad.getByRole('button', { name: /Piecewise function/ }).click();

  await expect(input).toHaveValue('f(x) := piecewise(x^2, x < 0; 2x + 1, x >= 0)');
  await expect(page.locator('.live-preview-panel math')).toBeVisible();
  await page.getByRole('button', { name: /Commit/ }).click();

  await expect(page.getByText(/Piecewise mathematics is first-class input/)).toBeVisible();
  await expect(page.getByText(/Saved f to the workspace\.|Updated f\./)).toBeVisible();
  await expect(page.getByRole('button', { name: /^Graph/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /^Derivative/ })).toHaveCount(0);
});

test('workspace commits mathematics and executes the Worker engine', async ({ page }) => {
  await openWorkspace(page);
  const input = page.getByRole('textbox', { name: 'Mathematical input' });
  await input.fill('x^2-1');
  await page.getByRole('button', { name: /Commit/ }).click();
  await expect(page.getByText('Working expression ready. Anonymous work stays temporary.')).toBeVisible();

  await page.getByRole('button', { name: /^Factor/ }).click();
  const result = page.locator('#mathlab-result');
  await expect(result).toBeVisible({ timeout: 15_000 });
  await expect(result.locator('.engine-error')).toHaveCount(0);
  await expect(result.getByText('EXACT', { exact: true })).toBeVisible();
});

test('worksheet persists committed mathematics and results across reload', async ({ page }) => {
  await openWorkspace(page);
  await expect(page.locator('.worksheet-save')).toHaveText('Saved');

  const input = page.getByRole('textbox', { name: 'Mathematical input' });
  await input.fill('x^2-1');
  await page.getByRole('button', { name: /Commit/ }).click();
  await expect(page.locator('.worksheet-entry-input')).toHaveCount(1);

  await page.getByRole('button', { name: /^Factor/ }).click();
  await expect(page.locator('#mathlab-result')).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole('button', { name: 'Use result', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Clear', exact: true }).click();

  await expect(page.locator('.worksheet-entry-result')).toHaveCount(1);
  await expect(page.locator('.worksheet-save')).toHaveText('Saved');
  await page.reload();

  await expect(page.getByRole('region', { name: 'Mathematical worksheet' })).toBeVisible();
  await expect(page.locator('.worksheet-entry-input')).toHaveCount(1);
  await expect(page.locator('.worksheet-entry-result')).toHaveCount(1);

  await page.locator('.worksheet-entry-result').getByRole('button', { name: 'Use result', exact: true }).click();
  await expect(input).not.toHaveValue('x^2-1');
  await expect(input).not.toHaveValue('');
});

test('worksheet undo redo and checkpoints remain usable', async ({ page }) => {
  await openWorkspace(page);
  await expect(page.locator('.worksheet-save')).toHaveText('Saved');

  const input = page.getByRole('textbox', { name: 'Mathematical input' });
  await input.fill('x+1');
  await page.getByRole('button', { name: /Commit/ }).click();
  await expect(page.locator('.worksheet-entry-input')).toHaveCount(1);

  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(page.locator('.worksheet-entry-input')).toHaveCount(0);
  await page.getByRole('button', { name: 'Redo', exact: true }).click();
  await expect(page.locator('.worksheet-entry-input')).toHaveCount(1);

  await page.getByRole('button', { name: 'Checkpoint', exact: true }).click();
  await page.getByText('History', { exact: true }).click();
  await expect(page.getByText('Saved checkpoints', { exact: true })).toBeVisible();
  await expect(page.locator('.worksheet-checkpoints button')).toHaveCount(1);

  await page.getByText('History', { exact: true }).click();
  await page.getByRole('button', { name: 'New session', exact: true }).click();
  await expect(page.locator('.worksheet-entry')).toHaveCount(0);
  await page.getByText('History', { exact: true }).click();
  const sessionSelect = page.getByRole('combobox', { name: 'Worksheet session' });
  await expect(sessionSelect).toBeVisible();
  await expect(sessionSelect.locator('option')).toHaveCount(2);
});

test('IndexedDB workspace state survives a browser reload', async ({ page }) => {
  await openWorkspace(page);
  const input = page.getByRole('textbox', { name: 'Mathematical input' });
  await input.fill('stable_probe := 2');
  await page.getByRole('button', { name: /Commit/ }).click();
  await expect(page.getByText(/Saved stable_probe to the workspace\.|Updated stable_probe\./)).toBeVisible();

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
      return Boolean(value?.objects?.some((object) => object.name === 'stable_probe' && object.source === 'stable_probe := 2'));
    } catch {
      return false;
    }
  }, undefined, { timeout: 15_000 });

  await expect(page.locator('.save-state')).toHaveText('Saved locally');
  await page.reload();
  await expect(page.locator('.workspace-main h1')).toHaveText('stable_probe');
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
  await expect(page).toHaveTitle('Work · MathLab');

  await context.setOffline(true);
  try {
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page).toHaveTitle('Work · MathLab');
    await expect(page.getByRole('textbox', { name: 'Mathematical input' })).toBeVisible();
  } finally {
    await context.setOffline(false);
  }
});
