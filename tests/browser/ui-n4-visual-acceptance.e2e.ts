import { expect, test } from '@playwright/test';

// UI-N4 captures a reproducible, populated mathematical workspace rather than
// relying on decorative placeholders or screenshot-only assertions.
const widths = [1440, 820, 390, 320] as const;
const routes = ['workspace', 'tools', 'visualize', 'proof', 'practice'] as const;

test('N4 screenshot acceptance covers responsive working screens and readable mobile navigation', async ({ page }, info) => {
  test.skip(info.project.name !== 'chromium-desktop', 'Canonical visual evidence runs once; normal suite covers other browser engines.');

  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/#/workspace');
  await expect(page.locator('.save-state')).toHaveText('Saved locally');
  await page.getByRole('textbox', { name: 'Mathematical input' }).fill('f(x) := x^2 - 3*x + 2');
  await page.getByRole('button', { name: /Commit/ }).click();
  await expect(page.locator('.object-sidebar')).toContainText('f');

  for (const width of widths) {
    await page.setViewportSize({ width, height: width >= 820 ? 900 : 800 });
    for (const route of routes) {
      await page.goto('/#/' + route);
      await expect(page.locator('#mathlab-main')).toBeVisible();
      // The route container exists before lazy modules have rendered. Wait for
      // real content, otherwise screenshots silently capture loading placeholders.
      const readySurface = {
        workspace: '.math-entry-composition',
        tools: '.tool-card',
        visualize: '.e3-canvas-frame',
        proof: '.m6-proof-editor',
        practice: '.m6-learning-hero',
      }[route];
      await expect(page.locator(readySurface).first()).toBeVisible();
      if (route === 'visualize') {
        await expect(page.locator('.e3-stage')).toBeVisible();
        await expect(page.locator('.e3-canvas-frame')).toBeVisible();
        // Readable formulas are as important as readable navigation labels.
        const mathInkContrast = await page.locator('.e3-object-list > button.is-active .math-preview').first().evaluate(math => {
          const channels = (value: string) => (value.match(/[0-9.]+/g) ?? []).slice(0, 3).map(Number);
          const luminance = (value: string) => {
            const [r, g, b] = channels(value).map(n => {
              const unit = n / 255;
              return unit <= .04045 ? unit / 12.92 : ((unit + .055) / 1.055) ** 2.4;
            });
            return .2126 * r + .7152 * g + .0722 * b;
          };
          const fg = luminance(getComputedStyle(math).color);
          const bg = luminance(getComputedStyle(math.closest('button')!).backgroundColor);
          return (Math.max(fg, bg) + .05) / (Math.min(fg, bg) + .05);
        });
        expect(mathInkContrast, 'Selected plot formula should be readable on its dark rail').toBeGreaterThanOrEqual(4.5);
        if (width <= 390) {
          const rect = await page.locator('.e3-canvas-frame').boundingBox();
          expect(rect).not.toBeNull();
          expect(rect!.y, 'Plot stage should reach the first mobile viewport').toBeLessThan(760);
        }
      }
      if (width <= 820) {
        const nav = page.getByRole('navigation', { name: 'Mobile primary navigation' });
        await expect(nav).toBeVisible();
        const contrast = await nav.evaluate(element => {
          function relativeLuminance(rgb: string): number {
            const values = rgb.match(/[\d.]+/g)?.slice(0, 3).map(Number) ?? [0, 0, 0];
            const linear = values.map(v => {
              const s = v / 255;
              return s <= .04045 ? s / 12.92 : ((s + .055) / 1.055) ** 2.4;
            });
            return .2126 * linear[0] + .7152 * linear[1] + .0722 * linear[2];
          }
          const navColor = getComputedStyle(element).backgroundColor;
          return [...element.querySelectorAll('button')].map(button => {
            const style = getComputedStyle(button);
            const bg = style.backgroundColor === 'rgba(0, 0, 0, 0)' ? navColor : style.backgroundColor;
            const fg = relativeLuminance(style.color);
            const back = relativeLuminance(bg);
            return { name: button.textContent?.trim(), ratio: (Math.max(fg, back) + .05) / (Math.min(fg, back) + .05) };
          });
        });
        expect(contrast).toHaveLength(3);
        for (const item of contrast) {
          expect(item.ratio, 'Mobile navigation contrast for ' + item.name).toBeGreaterThanOrEqual(4.5);
        }
      }
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
      expect(overflow, 'Page overflow: ' + route + ' ' + width).toBeLessThanOrEqual(1);
      await page.screenshot({ path: 'test-results/ui-n4-' + route + '-' + width + '.png', animations: 'disabled' });
    }
  }
  expect(errors).toEqual([]);
});
