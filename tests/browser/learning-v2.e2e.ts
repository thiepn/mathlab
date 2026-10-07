import { expect, test } from '@playwright/test';

test('P5 learning pathway reaches a worked example and concept-guided practice', async ({ page }) => {
  await page.goto('/#/practice');
  await expect(page).toHaveTitle('Learn · MathLab');
  await expect(page.getByRole('heading', { name: 'Learn the concept, study the method, then practice it.' })).toBeVisible();

  const pathway = page.getByRole('region', { name: 'Course learning pathway' });
  await expect(pathway).toBeVisible();
  await expect(pathway.getByText('Concepts before question pools')).toBeVisible();
  await expect(pathway.locator('.p5-coverage')).toContainText('engine capabilities mapped');

  const conceptNav = pathway.getByRole('navigation', { name: 'Course concepts' });
  await conceptNav.getByRole('button', { name: /Domain-safe transformations/ }).click();

  await expect(pathway.locator('.p5-concept-detail').getByRole('heading', { name: 'Domain-safe transformations' })).toBeVisible();
  await expect(pathway.getByText('Worked example', { exact: true })).toBeVisible();
  await expect(pathway.getByText('Cancellation with an excluded value')).toBeVisible();
  await expect(pathway.getByText('Engine connection')).toBeVisible();

  await pathway.getByRole('button', { name: 'Start guided practice' }).click();
  await expect(page.getByRole('heading', { name: 'Domain-safe transformations guided practice' })).toBeVisible();
  await expect(page.getByText('Guided practice', { exact: true })).toBeVisible();
  await expect(page.getByText('Cancellation and domain')).toBeVisible();
});

test('every P5 course exposes a concept pathway and engine coverage', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop', 'Course parity is deterministic; the full course sweep runs once.');

  await page.goto('/#/practice');
  const courseNav = page.locator('.m6-course-nav');
  await expect(courseNav).toBeVisible();
  const buttons = courseNav.locator('button');
  await expect(buttons).toHaveCount(8);

  for (let index = 0; index < 8; index += 1) {
    await buttons.nth(index).click();
    const pathway = page.getByRole('region', { name: 'Course learning pathway' });
    await expect(pathway).toBeVisible();
    await expect(pathway.getByRole('navigation', { name: 'Course concepts' }).locator('button').first()).toBeVisible();
    await expect(pathway.locator('.p5-coverage')).not.toContainText('0/0');
  }
});
