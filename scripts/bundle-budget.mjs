import { readFile, readdir, stat } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import { join } from 'node:path';

const DIST = 'dist';
const MANIFEST = join(DIST, '.vite', 'manifest.json');
const KiB = 1024;
const failures = [];

function fail(condition, message) {
  if (!condition) failures.push(message);
}

let manifest;
try {
  manifest = JSON.parse(await readFile(MANIFEST, 'utf8'));
} catch (error) {
  console.error('P9 bundle budget requires a completed Vite production build with build.manifest=true.');
  throw error;
}

const entries = Object.entries(manifest);
const mainEntry = entries.find(([, value]) => value?.isEntry && value?.src === 'src/main.tsx')
  ?? entries.find(([, value]) => value?.isEntry);

fail(Boolean(mainEntry), 'Vite manifest must contain a JavaScript entry chunk.');

if (mainEntry) {
  const [, value] = mainEntry;
  const buffer = await readFile(join(DIST, value.file));
  const raw = buffer.byteLength;
  const gzip = gzipSync(buffer).byteLength;
  fail(raw <= 800 * KiB, `Initial application entry exceeds 800 KiB raw (${Math.round(raw / KiB)} KiB).`);
  fail(gzip <= 260 * KiB, `Initial application entry exceeds 260 KiB gzip (${Math.round(gzip / KiB)} KiB).`);
}

const lazySources = [
  'src/app/components/ToolsPage.tsx',
  'src/app/components/VisualizationPage.tsx',
  'src/app/components/ProofLabPage.tsx',
  'src/app/components/PracticePage.tsx',
  'src/app/components/CourseReferencePage.tsx',
  'src/app/components/SharedSnapshotPage.tsx',
  'src/app/components/ContextPanel.tsx',
  'src/app/components/CommandPalette.tsx',
  'src/app/components/WorkspaceActions.tsx',
  'src/app/components/ShareSnapshotDialog.tsx',
];

for (const source of lazySources) {
  const record = entries.find(([key, value]) => key === source || value?.src === source)?.[1];
  fail(Boolean(record), `Bundle manifest is missing expected lazy module: ${source}`);
  if (record) fail(Boolean(record.isDynamicEntry), `Expected code-split module is not a dynamic entry: ${source}`);
}

const assetsDir = join(DIST, 'assets');
const assets = await readdir(assetsDir);
let largest = { name: '', raw: 0, gzip: 0 };
let totalCss = 0;
for (const name of assets) {
  const path = join(assetsDir, name);
  const info = await stat(path);
  if (name.endsWith('.css')) totalCss += info.size;
  if (!name.endsWith('.js')) continue;
  const buffer = await readFile(path);
  const compressed = gzipSync(buffer).byteLength;
  if (info.size > largest.raw) largest = { name, raw: info.size, gzip: compressed };
  fail(info.size <= 1_800 * KiB, `JavaScript chunk ${name} exceeds 1.8 MiB raw (${Math.round(info.size / KiB)} KiB).`);
  fail(compressed <= 600 * KiB, `JavaScript chunk ${name} exceeds 600 KiB gzip (${Math.round(compressed / KiB)} KiB).`);
}
fail(totalCss <= 320 * KiB, `Total production CSS exceeds 320 KiB raw (${Math.round(totalCss / KiB)} KiB).`);

if (failures.length) {
  console.error('P9 bundle budget failed:');
  for (const failure of failures) console.error('- ' + failure);
  process.exit(1);
}

console.log(`P9 bundle budget passed. Largest JS: ${largest.name} ${Math.round(largest.raw / KiB)} KiB raw / ${Math.round(largest.gzip / KiB)} KiB gzip; CSS total ${Math.round(totalCss / KiB)} KiB.`);
