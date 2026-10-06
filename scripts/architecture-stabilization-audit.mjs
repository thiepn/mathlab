import { readFile } from 'node:fs/promises';

const requiredFiles = [
  'src/app/routeModules.tsx',
  'src/app/App.tsx',
  'src/app/components/Workspace.tsx',
  'src/lib/storage/database.ts',
  'src/lib/storage/workspace.ts',
  'src/lib/storage/worksheet.ts',
  'src/lib/storage/health.ts',
  'src/main.tsx',
  'src/vite-env.d.ts',
  'vite.config.ts',
  'public/sw.js',
  'scripts/bundle-budget.mjs',
  'scripts/wait-for-production.mjs',
  'tests/storageHealth.test.ts',
  'tests/browser/architecture-stabilization.e2e.ts',
  'tests/production/production.live.ts',
  'docs/P9_ARCHITECTURE_STABILIZATION.md',
  'docs/ACCESSIBILITY_DEVICE_CERTIFICATION.md',
  'docs/ROADMAP.md',
  'package.json',
  '.github/workflows/ci.yml',
  '.github/workflows/deploy.yml',
];

const files = new Map();
for (const path of requiredFiles) files.set(path, await readFile(path, 'utf8'));

const failures = [];
function requireText(path, needle, message) {
  if (!files.get(path)?.includes(needle)) failures.push(message + ' (' + path + ')');
}
function forbidText(path, needle, message) {
  if (files.get(path)?.includes(needle)) failures.push(message + ' (' + path + ')');
}

for (const marker of [
  "import('./components/ToolsPage')",
  "import('./components/VisualizationPage')",
  "import('./components/ProofLabPage')",
  "import('./components/PracticePage')",
  "import('./components/CourseReferencePage')",
  "import('./components/SharedSnapshotPage')",
  "import('./components/ContextPanel')",
  "import('./components/CommandPalette')",
]) requireText('src/app/routeModules.tsx', marker, 'Lazy route/transient module boundary is incomplete');

for (const eager of [
  "from './components/ToolsPage'",
  "from './components/VisualizationPage'",
  "from './components/ProofLabPage'",
  "from './components/PracticePage'",
  "from './components/CourseReferencePage'",
  "from './components/SharedSnapshotPage'",
  "from './components/ContextPanel'",
  "from './components/CommandPalette'",
]) forbidText('src/app/App.tsx', eager, 'App.tsx reintroduced an eager heavy surface');

requireText('src/app/App.tsx', 'Suspense', 'App shell must expose Suspense boundaries');
requireText('src/app/components/Workspace.tsx', "import('./WorkspaceActions')", 'Workspace capability actions are not deferred');
requireText('src/app/components/Workspace.tsx', "import('./ShareSnapshotDialog')", 'Share creation UI is not deferred');
requireText('src/app/components/Workspace.tsx', 'inspectStorageHealth', 'Workspace storage-health surface is missing');

requireText('src/lib/storage/database.ts', 'replaceVersionedWithRecovery', 'Atomic cross-tab persistence primitive is missing');
requireText('src/lib/storage/database.ts', 'this.dbPromise = null;', 'Blocked/open retry reset is missing');
requireText('src/lib/storage/workspace.ts', 'replaceVersionedWithRecovery', 'Workspace does not use atomic Recovery replacement');
requireText('src/lib/storage/worksheet.ts', 'replaceVersionedWithRecovery', 'Worksheet does not use atomic Recovery replacement');
requireText('src/lib/storage/health.ts', 'classifyStoragePressure', 'Storage pressure model is missing');
requireText('src/lib/storage/health.ts', 'navigator.storage.persist()', 'Explicit durable-storage request is missing');

requireText('vite.config.ts', 'manifest: true', 'Production manifest must remain enabled');
requireText('vite.config.ts', 'GITHUB_SHA', 'Production build identity must use the deployed commit');
requireText('src/main.tsx', "./sw.js?v=", 'Service worker registration is not build-scoped');
requireText('src/vite-env.d.ts', '__MATHLAB_BUILD_ID__', 'Build identity type contract is missing');
requireText('public/sw.js', "CACHE_PREFIX = 'mathlab-build-'", 'Build-scoped cache prefix is missing');
requireText('public/sw.js', "key.startsWith('mathlab-v2-')", 'Legacy v2 cache cleanup is missing');
requireText('public/sw.js', 'currentRuntime.match', 'Runtime cache lookup must be restricted to the current build');

requireText('scripts/bundle-budget.mjs', '800 * KiB', 'Initial-entry bundle budget is missing');
requireText('scripts/bundle-budget.mjs', 'isDynamicEntry', 'Bundle audit does not verify dynamic entries');
requireText('package.json', '"audit:architecture"', 'P9 architecture audit script is missing');
requireText('package.json', '"audit:bundle"', 'P9 bundle budget script is missing');
requireText('package.json', 'npm run audit:architecture', 'Release aggregate omits P9 architecture audit');

for (const workflow of ['.github/workflows/ci.yml', '.github/workflows/deploy.yml']) {
  requireText(workflow, 'npm run audit:architecture', 'Workflow omits P9 architecture audit');
  requireText(workflow, 'npm run audit:bundle', 'Workflow omits post-build bundle budget');
}

requireText('tests/storageHealth.test.ts', "describe('P9 storage health'", 'Storage health unit certification is missing');
requireText('tests/browser/architecture-stabilization.e2e.ts', 'heavy product modules load on demand', 'Lazy-loading browser certification is missing');
requireText('tests/browser/architecture-stabilization.e2e.ts', 'build-scoped registration and cache generation', 'PWA generation browser certification is missing');
requireText('tests/production/production.live.ts', 'build-scoped service worker are published', 'Live production gate is not build-scoped');
requireText('scripts/wait-for-production.mjs', "CACHE_PREFIX = 'mathlab-build-'", 'Production readiness probe does not recognize P9 service worker');
requireText('docs/ACCESSIBILITY_DEVICE_CERTIFICATION.md', 'P9 physical qualification readiness', 'Physical qualification boundary is not documented');
requireText('docs/P9_ARCHITECTURE_STABILIZATION.md', 'Physical-device and assistive-technology validation remains external evidence', 'P9 doc must not fabricate physical certification');
requireText('docs/ROADMAP.md', '| **P9 — Architecture stabilization** | Route/module splitting, atomic storage hardening, build-scoped PWA caching, measurable bundle budgets and physical-accessibility qualification readiness. | **Complete** |', 'Roadmap does not mark P9 complete');

if (failures.length) {
  console.error('P9 Architecture Stabilization audit failed:');
  for (const failure of failures) console.error('- ' + failure);
  process.exit(1);
}
console.log('P9 Architecture Stabilization audit passed.');
