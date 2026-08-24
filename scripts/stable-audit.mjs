import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const failures = [];
const pass = (condition, message) => { if (!condition) failures.push(message); };
const text = (path) => readFileSync(join(root, path), 'utf8');

const pkg = JSON.parse(text('package.json'));
pass(['2.0.0-rc.1', '2.0.0'].includes(pkg.version), 'stable gate only accepts v2.0.0-rc.1 or v2.0.0 package identity');
pass(pkg.devDependencies?.['@playwright/test'] === '1.62.1', 'Playwright must stay pinned to 1.62.1 for this certification record');
pass(pkg.scripts?.['test:e2e'] === 'playwright test --config=playwright.config.mjs', 'test:e2e must execute the stable Playwright configuration');
pass(typeof pkg.scripts?.['audit:stable'] === 'string', 'audit:stable script missing');

for (const file of ['playwright.config.mjs', 'tests/browser/stable-release.e2e.ts', '.github/workflows/ci.yml', 'public/sw.js', 'docs/RELEASE_CERTIFICATION.md']) {
  pass(existsSync(join(root, file)), `missing stable-release artifact: ${file}`);
}

const config = text('playwright.config.mjs');
for (const project of ['chromium-desktop', 'firefox-desktop', 'webkit-desktop', 'android-chromium', 'ios-webkit']) {
  pass(config.includes(`name: '${project}'`), `Playwright stable gate missing ${project}`);
}
pass(config.includes("baseURL: 'http://127.0.0.1:4173'"), 'Playwright base URL must use loopback preview');
pass(config.includes("testMatch: /.*\\.e2e\\.ts/"), 'Playwright must stay isolated from the Vitest suite');

const browser = text('tests/browser/stable-release.e2e.ts');
for (const marker of [
  'every primary route is reachable',
  'without horizontal page overflow',
  'command palette opens from the keyboard',
  'executes the Worker engine',
  'IndexedDB workspace state survives a browser reload',
  'offline application reload',
]) pass(browser.includes(marker), `browser stable suite missing: ${marker}`);

const sw = text('public/sw.js');
pass(sw.includes("mathlab-v2-shell"), 'v2 shell cache generation is missing');
pass(sw.includes("mathlab-v2-runtime"), 'v2 runtime cache generation is missing');
pass(!sw.includes("mathlab-e3-shell") && !sw.includes("mathlab-e3-runtime"), 'E3 cache generation must not remain active in v2');

const ci = text('.github/workflows/ci.yml');
pass(ci.includes('npm run audit:stable'), 'CI must run stable release audit');
pass(ci.includes('npm audit --audit-level=high'), 'CI must reject high/critical dependency advisories');
pass(ci.includes('playwright install --with-deps chromium firefox webkit'), 'CI must install all certified browser engines');
pass(ci.includes('npm run test:e2e'), 'CI must execute stable browser certification');

if (failures.length) {
  console.error(`MathLab stable release audit failed (${failures.length} issue${failures.length === 1 ? '' : 's'}):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('MathLab v2 stable release audit: PASS');
