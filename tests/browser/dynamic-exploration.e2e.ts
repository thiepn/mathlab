import { expect, test } from '@playwright/test';

async function buildParameterizedFunction(page: import('@playwright/test').Page) {
  await page.goto('/#/workspace');
  const input = page.getByRole('textbox', { name: 'Mathematical input' });

  await input.fill('a := 2');
  await page.getByRole('button', { name: /Commit/ }).click();
  await expect(page.getByText(/Saved a to the workspace\.|Updated a\./)).toBeVisible();

  await input.fill('f(x) := a*x^2+b');
  await page.getByRole('button', { name: /Commit/ }).click();
  await expect(page.getByText(/Saved f to the workspace\.|Updated f\./)).toBeVisible();

  await page.goto('/#/visualize');
  await expect(page.getByRole('region', { name: 'Dynamic exploration' })).toBeVisible();
}

test('P6 links parameters, graph, result and value table', async ({ page }) => {
  await buildParameterizedFunction(page);

  const dynamic = page.getByRole('region', { name: 'Dynamic exploration' });
  await expect(dynamic.getByText('Formula, graph, values — one state.')).toBeVisible();
  await expect(dynamic.getByRole('slider', { name: 'a slider' })).toHaveValue('2');
  await expect(dynamic.getByRole('slider', { name: 'b slider' })).toHaveValue('1');

  const line = page.locator('.graph-series-line').first();
  await expect(line).toBeVisible();
  const before = await line.getAttribute('points');

  const aValue = dynamic.getByRole('spinbutton', { name: 'a value' });
  await aValue.fill('3');
  await expect(aValue).toHaveValue('3');
  await expect.poll(async () => line.getAttribute('points')).not.toBe(before);

  await dynamic.getByRole('button', { name: '0', exact: true }).click();
  await expect(dynamic.getByText('Evaluate at x = 0')).toBeVisible();
  await expect(page.locator('.graph-trace')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Trace', exact: true })).toHaveClass(/is-on/);
});

test('P6 dynamic exploration remains usable across every visualization course object', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop', 'Broad P6 source coverage runs once; the shared route/device matrix covers responsive behavior.');

  await page.goto('/#/workspace');
  const input = page.getByRole('textbox', { name: 'Mathematical input' });

  for (const source of ['g(x) := c*sin(x)', 'h(x,y) := k*(x^2+y^2)']) {
    await input.fill(source);
    await page.getByRole('button', { name: /Commit/ }).click();
  }

  await page.goto('/#/visualize');
  const dynamic = page.getByRole('region', { name: 'Dynamic exploration' });
  await expect(dynamic).toBeVisible();

  const objectList = page.locator('.e3-object-list');
  await objectList.getByRole('button', { name: /h/ }).first().click();
  await expect(dynamic.getByRole('slider', { name: 'k slider' })).toBeVisible();

  await objectList.getByRole('button', { name: /g/ }).first().click();
  await expect(dynamic.getByRole('slider', { name: 'c slider' })).toBeVisible();

  await dynamic.getByRole('button', { name: 'Reset parameters' }).click();
  await expect(dynamic.getByRole('slider', { name: 'c slider' })).toHaveValue('1');
});
