import { defineConfig } from '@playwright/test';

const productionURL = process.env.MATHLAB_PRODUCTION_URL ?? 'https://thiepn.dev/mathlab/';

export default defineConfig({
  testDir: './tests/production',
  testMatch: /.*\.live\.ts/,
  fullyParallel: false,
  forbidOnly: true,
  retries: 0,
  workers: 1,
  reporter: process.env.CI ? 'line' : 'list',
  timeout: 60_000,
  expect: { timeout: 15_000 },
  use: {
    baseURL: productionURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'production-chromium',
      use: {
        browserName: 'chromium',
        viewport: { width: 1440, height: 900 },
      },
    },
    {
      name: 'production-ios-webkit',
      use: {
        browserName: 'webkit',
        viewport: { width: 390, height: 844 },
        deviceScaleFactor: 3,
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
});
