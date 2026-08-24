import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const failures = [];
const pass = (condition, message) => { if (!condition) failures.push(message); };
const text = (path) => readFileSync(join(root, path), 'utf8');

const pkg = JSON.parse(text('package.json'));
pass(pkg.version === '2.0.0', 'stable gate requires package identity 2.0.0');
pass(pkg.devDependencies?.['@playwright/test'] === '1.62.1', 'Playwright must stay pinned to 1.62.1 for this certification record');
pass(pkg.scripts?.['test:e2e'] === 'playwright test --config=playwright.config.mjs', 'test:e2e must execute the stable Playwright configuration');
pass(typeof pkg.scripts?.['audit:stable'] === 'string', 'audit:stable script missing');

for (const file of [
  'playwright.config.mjs',
  'playwright.production.config.mjs',
  'tests/browser/stable-release.e2e.ts',
  'tests/production/production.live.ts',
  'scripts/wait-for-production.mjs',
  '.github/workflows/ci.yml',
  '.github/workflows/deploy.yml',
  'public/sw.js',
  'docs/RELEASE_CERTIFICATION.md',
]) pass(existsSync(join(root, file)), `missing stable-release artifact: ${file}`);

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
  'standard release widths remain structurally responsive',
  'command palette opens from the keyboard',
  'executes the Worker engine',
  'IndexedDB workspace state survives a browser reload',
  'offline application reload',
]) pass(browser.includes(marker), `browser stable suite missing: ${marker}`);

const productionConfig = text('playwright.production.config.mjs');
pass(productionConfig.includes("https://thiepn.dev/mathlab/"), 'production Playwright gate must target the canonical custom domain');
pass(productionConfig.includes('retries: 0'), 'production verification must not hide failures behind retries');
for (const project of ['production-chromium', 'production-ios-webkit']) {
  pass(productionConfig.includes(`name: '${project}'`), `production Playwright gate missing ${project}`);
}
pass(!productionConfig.includes('webServer:'), 'production Playwright gate must not start a local preview server');

const production = text('tests/production/production.live.ts');
for (const marker of [
  'custom-domain stable build boots',
  'production manifest, icons and v2 service worker are published',
  'live Worker-backed mathematics executes',
  'live IndexedDB workspace persists across a production reload',
  'production layout has no page-level horizontal overflow',
  'deployed service worker supports an offline reload',
]) pass(production.includes(marker), `production verification suite missing: ${marker}`);

const waitForProduction = text('scripts/wait-for-production.mjs');
pass(waitForProduction.includes('MATHLAB_PRODUCTION_URL'), 'production readiness probe must accept the canonical production URL');
pass(waitForProduction.includes('mathlab-v2-shell') && waitForProduction.includes('mathlab-v2-runtime'), 'production readiness probe must identify the v2 service-worker generation');

const sw = text('public/sw.js');
pass(sw.includes("mathlab-v2-shell"), 'v2 shell cache generation is missing');
pass(sw.includes("mathlab-v2-runtime"), 'v2 runtime cache generation is missing');
pass(!sw.includes("mathlab-e3-shell") && !sw.includes("mathlab-e3-runtime"), 'E3 cache generation must not remain active in v2');

const header = text('src/app/components/Header.tsx');
pass(header.includes('v2.0.0 stable release'), 'stable UI title is missing');
pass(header.includes('>v2.0</span>'), 'stable UI badge is missing');
pass(!header.includes('RC1') && !header.includes('2.0.0-rc.1'), 'stable UI must not retain RC identity');

const release = text('docs/RELEASE_CERTIFICATION.md');
pass(release.includes('v2.0.0'), 'stable certification record must identify v2.0.0');
pass(release.includes('STABLE RELEASE GATE'), 'stable certification record must contain the stable release gate decision');
pass(release.includes('physical-device') || release.includes('physical device'), 'certification record must distinguish physical-device validation from automated evidence');

const ci = text('.github/workflows/ci.yml');
pass(ci.includes('npm run audit:stable'), 'CI must run stable release audit');
pass(ci.includes('npm audit --audit-level=high'), 'CI must reject high/critical dependency advisories');
pass(ci.includes('playwright install --with-deps chromium firefox webkit'), 'CI must install all certified browser engines');
pass(ci.includes('npm run test:e2e'), 'CI must execute stable browser certification');
pass(ci.includes('playwright.production.config.mjs --list'), 'CI must validate the post-deploy production verification harness without contacting production');

const deploy = text('.github/workflows/deploy.yml');
pass(deploy.includes('npm run audit:stable'), 'Pages deployment must run stable release audit');
pass(deploy.includes('npm audit --audit-level=high'), 'Pages deployment must reject high/critical dependency advisories');
pass(deploy.includes('verify-production:'), 'Pages workflow must contain a post-deploy live verification job');
pass(deploy.includes('needs: deploy'), 'live production verification must run only after Pages deployment completes');
pass(deploy.includes('https://thiepn.dev/mathlab/'), 'live production verification must target the canonical custom domain');
pass(deploy.includes('node scripts/wait-for-production.mjs'), 'Pages workflow must wait for custom-domain propagation before browser verification');
pass(deploy.includes('playwright.production.config.mjs'), 'Pages workflow must execute the production Playwright configuration');

if (failures.length) {
  console.error(`MathLab stable release audit failed (${failures.length} issue${failures.length === 1 ? '' : 's'}):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('MathLab v2 stable release audit: PASS');
