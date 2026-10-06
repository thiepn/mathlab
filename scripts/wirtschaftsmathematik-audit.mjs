import { readFile } from 'node:fs/promises';

const requiredFiles = [
  'src/lib/math/p7Wirtschaftsmathematik.ts',
  'src/lib/math/p7Engine.ts',
  'src/lib/math/capabilitiesP7.ts',
  'src/app/p7ToolCatalog.ts',
  'src/app/components/P7OperationControls.tsx',
  'src/lib/worker/math.worker.ts',
  'src/lib/math/capabilitiesE5.ts',
  'src/app/capabilityRegistry.ts',
  'src/app/workspaceOperations.ts',
  'tests/wirtschaftsmathematik.test.ts',
  'tests/browser/wirtschaftsmathematik.e2e.ts',
  'docs/P7_WIRTSCHAFTSMATHEMATIK.md',
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

for (const operation of [
  'simplex-linear-program',
  'assignment-problem',
  'transportation-problem',
  'time-series-profile',
  'exponential-smoothing',
  'polynomial-least-squares',
]) {
  requireText('src/app/p7ToolCatalog.ts', `operation:'${operation}'`, `Catalog metadata missing for ${operation}`);
  requireText('src/lib/math/p7Engine.ts', `'${operation}'`, `Engine dispatch missing for ${operation}`);
  requireText('src/app/components/P7OperationControls.tsx', `'${operation}'`, `Operation control missing for ${operation}`);
}

requireText('src/lib/math/p7Wirtschaftsmathematik.ts', 'simplexLinearProgram', 'General simplex implementation is missing');
requireText('src/lib/math/p7Wirtschaftsmathematik.ts', 'assignmentProblem', 'Assignment implementation is missing');
requireText('src/lib/math/p7Wirtschaftsmathematik.ts', 'transportationProblem', 'Transportation implementation is missing');
requireText('src/lib/math/p7Wirtschaftsmathematik.ts', 'householderLeastSquares', 'QR least-squares implementation is missing');
requireText('src/lib/math/p7Wirtschaftsmathematik.ts', 'timeSeriesProfile', 'Time-series profile is missing');
requireText('src/lib/math/p7Wirtschaftsmathematik.ts', 'exponentialSmoothing', 'Forecasting workflow is missing');
requireText('src/lib/worker/math.worker.ts', 'P7MathEngine', 'Production worker is not using the P7 engine layer');
requireText('src/lib/math/capabilitiesE5.ts', 'p7CapabilitiesForObject', 'Runtime capability aggregation omits P7');
requireText('src/app/capabilityRegistry.ts', 'P7_TOOL_CATALOG', 'Canonical capability registry omits P7');
requireText('src/app/capabilityRegistry.ts', "'Optimization & OR'", 'Optimization & OR is not mapped into a learning course');
requireText('src/app/workspaceOperations.ts', "'simplex-linear-program'", 'Workspace operation policy omits P7');
requireText('tests/wirtschaftsmathematik.test.ts', "describe('Post-v2 P7 Wirtschaftsmathematik'", 'P7 unit certification is missing');
requireText('tests/browser/wirtschaftsmathematik.e2e.ts', 'P7 time-series workflow', 'P7 browser acceptance is missing');
requireText('docs/ROADMAP.md', '| **P7 — Wirtschaftsmathematik expansion** | Optimization/OR, probability/statistics and applied numerical priorities. | **Complete** |', 'Roadmap does not mark P7 complete');
requireText('package.json', '"audit:wirtschaft"', 'Package scripts do not expose the P7 audit');
requireText('package.json', 'npm run audit:wirtschaft', 'Release aggregate does not execute the P7 audit');
requireText('.github/workflows/ci.yml', 'npm run audit:wirtschaft', 'PR CI does not execute the P7 audit');
requireText('.github/workflows/deploy.yml', 'npm run audit:wirtschaft', 'Deployment CI does not execute the P7 audit');

if (failures.length) {
  console.error('P7 Wirtschaftsmathematik audit failed:');
  for (const failure of failures) console.error('- ' + failure);
  process.exit(1);
}

console.log('P7 Wirtschaftsmathematik audit passed.');
