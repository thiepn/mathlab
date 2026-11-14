import { expect, test, type Page } from '@playwright/test';

// This forensic suite runs only against the already deployed public MathLab
// origin, in isolated Playwright browser contexts. It cannot deploy or write
// to a user's personal browser profile.
const productionURL = process.env.MATHLAB_PRODUCTION_URL ?? 'https://thiepn.dev/mathlab/';

interface WorkspaceValue {
  objects?: Array<{ id?: string; name?: string; source?: string }>;
  activeObjectId?: string;
}

async function readCommittedWorkspace(page: Page): Promise<WorkspaceValue | null> {
  return page.evaluate(() => new Promise<WorkspaceValue | null>((resolve) => {
    const open = indexedDB.open('mathlab', 1);
    open.onerror = () => resolve(null);
    open.onblocked = () => resolve(null);
    open.onsuccess = () => {
      const db = open.result;
      try {
        const tx = db.transaction('records', 'readonly');
        const req = tx.objectStore('records').get('workspace:p15:default');
        req.onerror = () => { db.close(); resolve(null); };
        req.onsuccess = () => { const value = (req.result?.value ?? null) as WorkspaceValue | null; db.close(); resolve(value); };
      } catch {
        db.close();
        resolve(null);
      }
    };
  }));
}

test('forensic: persisted mathematical object, selection and editor survive reload', async ({ page }) => {
  await page.goto(new URL('./#/workspace', productionURL).toString(), { waitUntil: 'domcontentloaded' });
  await expect(page).toHaveTitle('Work · MathLab');
  await expect(page.locator('.save-state')).toHaveText('Saved locally');

  const input = page.getByRole('textbox', { name: 'Mathematical input' });
  await input.fill('production_probe := 2');
  await page.getByRole('button', { name: /Commit/ }).click();
  await expect(page.getByText(/Saved production_probe to the workspace\.|Updated production_probe\./)).toBeVisible();

  await expect.poll(async () => readCommittedWorkspace(page), { timeout: 20_000 }).toEqual(
    expect.objectContaining({
      objects: expect.arrayContaining([expect.objectContaining({ name: 'production_probe', source: 'production_probe := 2' })]),
      activeObjectId: expect.any(String),
    }),
  );
  const before = await readCommittedWorkspace(page);
  const saved = before?.objects?.find(object => object.name === 'production_probe');
  expect(saved?.id).toBe(before?.activeObjectId);
  await expect(page.locator('.save-state')).toHaveText('Saved locally');

  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.locator('.save-state')).toHaveText('Saved locally');
  await expect(page.locator('.workspace-main h1')).toHaveText('production_probe');
  await expect(page.getByRole('textbox', { name: 'Mathematical input' })).toHaveValue('production_probe := 2');

  const after = await readCommittedWorkspace(page);
  expect(after?.objects?.find(object => object.name === 'production_probe')?.id).toBe(saved?.id);
  expect(after?.activeObjectId).toBe(saved?.id);
});
