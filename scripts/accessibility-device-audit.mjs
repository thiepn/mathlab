import { readFile } from 'node:fs/promises';

const requiredFiles = [
  'package.json',
  'playwright.config.mjs',
  'tests/browser/accessibility-device.e2e.ts',
  'src/styles/global.css',
  '.github/workflows/ci.yml',
  '.github/workflows/deploy.yml',
  'docs/ACCESSIBILITY_DEVICE_CERTIFICATION.md',
  'public/manifest.webmanifest',
];

const files = Object.fromEntries(await Promise.all(requiredFiles.map(async (path) => [path, await readFile(path, 'utf8')])));
const packageJson = JSON.parse(files['package.json']);
const manifest = JSON.parse(files['public/manifest.webmanifest']);
const failures = [];

function requireCondition(condition, message) {
  if (!condition) failures.push(message);
}

requireCondition(packageJson.devDependencies?.['@axe-core/playwright'] === '4.13.0', 'Pinned @axe-core/playwright 4.13.0 is required.');
requireCondition(packageJson.scripts?.['audit:accessibility'] === 'node scripts/accessibility-device-audit.mjs', 'audit:accessibility script is missing.');
requireCondition(packageJson.scripts?.['check:release']?.includes('audit:accessibility'), 'check:release must include the accessibility audit.');

const config = files['playwright.config.mjs'];
for (const project of ['android-chromium', 'ios-webkit', 'android-tablet-chromium', 'ipad-webkit']) {
  requireCondition(config.includes(`name: '${project}'`), `Playwright project ${project} is required.`);
}

const browserTests = files['tests/browser/accessibility-device.e2e.ts'];
for (const marker of ['AxeBuilder', 'wcag22aa', '200% text', 'reduced-motion', 'forced-colors', '24px minimum', 'service-worker registration']) {
  requireCondition(browserTests.includes(marker), `Accessibility browser test marker missing: ${marker}`);
}

const css = files['src/styles/global.css'];
requireCondition(css.includes('@media (prefers-reduced-motion: reduce)'), 'Reduced-motion CSS handling is required.');
requireCondition(css.includes('@media (forced-colors: active)'), 'Forced-colors CSS handling is required.');

for (const workflow of ['.github/workflows/ci.yml', '.github/workflows/deploy.yml']) {
  requireCondition(files[workflow].includes('npm run audit:accessibility'), `${workflow} must execute audit:accessibility.`);
}

const documentation = files['docs/ACCESSIBILITY_DEVICE_CERTIFICATION.md'];
for (const marker of ['Automated certification boundary', 'Physical-device and assistive-technology validation', 'not physical-device certification', 'not screen-reader certification']) {
  requireCondition(documentation.includes(marker), `Certification boundary documentation missing: ${marker}`);
}

requireCondition(manifest.name === 'MathLab' && manifest.short_name === 'MathLab', 'PWA manifest identity is invalid.');
requireCondition(manifest.display === 'standalone' && manifest.start_url === './' && manifest.scope === './', 'PWA manifest installability source contract is invalid.');
const icons = Array.isArray(manifest.icons) ? manifest.icons : [];
requireCondition(icons.some((icon) => icon.sizes === '192x192'), 'PWA 192x192 icon is required.');
requireCondition(icons.some((icon) => icon.sizes === '512x512' && String(icon.purpose).includes('any')), 'PWA 512x512 any-purpose icon is required.');
requireCondition(icons.some((icon) => icon.sizes === '512x512' && String(icon.purpose).includes('maskable')), 'PWA 512x512 maskable icon is required.');

if (failures.length) {
  console.error('MathLab accessibility/device certification audit: FAIL');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('MathLab accessibility/device certification audit: PASS');
