import { readFile } from 'node:fs/promises';

const requiredFiles = [
  'src/app/dynamicExploration.ts',
  'src/app/components/DynamicExplorationPanel.tsx',
  'src/app/components/GraphCanvas.tsx',
  'src/app/components/VisualizationPageE3.tsx',
  'src/styles/p6.css',
  'src/main.tsx',
  'tests/dynamicExploration.test.ts',
  'tests/browser/dynamic-exploration.e2e.ts',
  'docs/P6_DYNAMIC_EXPLORATION.md',
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

requireText('src/app/dynamicExploration.ts', 'dynamicParameterNames', 'Dynamic parameter discovery is missing');
requireText('src/app/dynamicExploration.ts', 'resolveDynamicAst', 'Dynamic AST resolution is missing');
requireText('src/app/dynamicExploration.ts', 'buildExplorationTable', 'Linked table generation is missing');
requireText('src/app/components/DynamicExplorationPanel.tsx', 'Formula, graph, values — one state.', 'Linked exploration surface is missing');
requireText('src/app/components/DynamicExplorationPanel.tsx', 'Scrollable function value table', 'Accessible table scroll region is missing');
requireText('src/app/components/GraphCanvas.tsx', 'traceX?: number | null', 'Controlled graph trace is missing');
requireText('src/app/components/VisualizationPageE3.tsx', "setInteractionMode('trace')", 'Table/trace interaction is not integrated');
requireText('src/app/components/VisualizationPageE3.tsx', 'resolveDynamicAst', 'Visualization does not consume P6 AST resolution');
requireText('src/styles/p6.css', '.p6-dynamic-panel', 'P6 styles are missing');
requireText('src/main.tsx', "./styles/p6.css", 'P6 stylesheet is not loaded by the application');
requireText('tests/dynamicExploration.test.ts', "describe('P6 dynamic exploration'", 'P6 unit coverage is missing');
requireText('tests/browser/dynamic-exploration.e2e.ts', 'P6 links parameters, graph, result and value table', 'P6 browser acceptance is missing');
requireText('docs/ROADMAP.md', '| **P6 — Dynamic exploration** | Parameters/sliders, tables and linked formula/graph/result workflows. | **Complete** |', 'Roadmap does not mark P6 complete');
requireText('package.json', '"audit:dynamic"', 'Package scripts do not expose the P6 audit');
requireText('package.json', 'npm run audit:dynamic', 'Release aggregate does not execute the P6 audit');
requireText('.github/workflows/ci.yml', 'npm run audit:dynamic', 'Pull-request CI does not execute the P6 audit');
requireText('.github/workflows/deploy.yml', 'npm run audit:dynamic', 'Deployment CI does not execute the P6 audit');

if (failures.length) {
  console.error('P6 Dynamic exploration audit failed:');
  for (const failure of failures) console.error('- ' + failure);
  process.exit(1);
}

console.log('P6 Dynamic exploration audit passed.');
