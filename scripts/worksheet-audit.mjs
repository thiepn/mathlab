import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const failures = [];
const pass = (condition, message) => { if (!condition) failures.push(message); };
const text = (path) => readFileSync(join(root, path), 'utf8');

for (const file of [
  'src/lib/math/worksheetTypes.ts',
  'src/lib/storage/worksheet.ts',
  'src/app/hooks/useWorksheet.ts',
  'src/app/components/WorksheetTimeline.tsx',
  'tests/worksheetPersistence.test.ts',
  'tests/browser/stable-release.e2e.ts',
  'tests/production/production.live.ts',
  'docs/P2_MATHEMATICAL_WORKSHEET_ACCEPTANCE.md',
]) pass(existsSync(join(root, file)), `missing P2 worksheet artifact: ${file}`);

const storage = text('src/lib/storage/worksheet.ts');
for (const marker of [
  "worksheet:p2:default",
  "worksheet:p2:recovery",
  "worksheet:p2:checkpoints",
  'saveWorksheet',
  'loadRecoveryWorksheet',
  'createWorksheetExport',
  'parseWorksheetImport',
]) pass(storage.includes(marker), `worksheet storage contract missing: ${marker}`);

const controller = text('src/app/hooks/useWorksheet.ts');
for (const marker of [
  'recordInput',
  'recordResult',
  'undo',
  'redo',
  'checkpoint',
  'restoreCheckpoint',
  'restoreRecovery',
  'newSession',
  'selectSession',
]) pass(controller.includes(marker), `worksheet controller contract missing: ${marker}`);

const app = text('src/app/App.tsx');
pass(app.includes('useWorksheet()'), 'App must initialize the worksheet controller.');
pass(app.includes('worksheet.recordResult(result)'), 'successful engine results must be recorded in the worksheet.');

const workspace = text('src/app/components/Workspace.tsx');
pass(workspace.includes('worksheet.recordInput'), 'successful mathematical commits must be recorded in the worksheet.');
pass(workspace.includes('<WorksheetTimeline'), 'Workbench must render the persistent worksheet timeline.');
pass(workspace.includes('onUseResult={onReuseSource}'), 'active results must support reuse as mathematical input.');

const browser = text('tests/browser/stable-release.e2e.ts');
for (const marker of [
  'worksheet persists committed mathematics and results across reload',
  'worksheet undo redo and checkpoints remain usable',
]) pass(browser.includes(marker), `P2 browser acceptance marker missing: ${marker}`);

const production = text('tests/production/production.live.ts');
pass(production.includes('live worksheet persists across a production reload'), 'P2 live production worksheet verification is missing.');

if (failures.length) {
  console.error(`MathLab P2 worksheet audit failed (${failures.length} issue${failures.length === 1 ? '' : 's'}):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('MathLab P2 mathematical worksheet audit: PASS');
