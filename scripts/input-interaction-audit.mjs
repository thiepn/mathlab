import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const failures = [];
const pass = (condition, message) => { if (!condition) failures.push(message); };
const text = (path) => readFileSync(join(root, path), 'utf8');

for (const file of [
  'src/lib/math/inputEditing.ts',
  'src/lib/math/piecewise.ts',
  'src/app/components/MathKeypad.tsx',
  'src/app/components/MathInput.tsx',
  'src/styles/p3.css',
  'tests/p3-input-interaction.test.ts',
  'tests/browser/stable-release.e2e.ts',
  'tests/browser/accessibility-device.e2e.ts',
  'tests/production/production.live.ts',
  'docs/P3_INPUT_INTERACTION_ACCEPTANCE.md',
]) pass(existsSync(join(root, file)), `missing P3 input/interaction artifact: ${file}`);

const ast = text('src/lib/math/ast.ts');
pass(ast.includes("type: 'piecewise'"), 'piecewise must be a first-class AST node');
pass(ast.includes("'invalid-piecewise'"), 'piecewise parser diagnostics must be explicit');

const parser = text('src/lib/math/parser.ts');
for (const marker of ['finishPiecewise', "name.toLowerCase() === 'piecewise'", 'invalid-piecewise']) {
  pass(parser.includes(marker), `piecewise parser contract missing: ${marker}`);
}

const editing = text('src/lib/math/inputEditing.ts');
for (const marker of [
  'applyInputTemplate',
  'applyOpeningDelimiter',
  'skipClosingDelimiter',
  'removeEmptyDelimiterPair',
  'nextInputBoundary',
  "category: 'structure'",
  "id: 'piecewise'",
]) pass(editing.includes(marker), `structured input contract missing: ${marker}`);

const input = text('src/app/components/MathInput.tsx');
for (const marker of [
  '<MathKeypad',
  'Ctrl/⌘+Enter',
  'applyOpeningDelimiter',
  'removeEmptyDelimiterPair',
  'nextInputBoundary',
  "event.ctrlKey || event.metaKey",
]) pass(input.includes(marker), `Universal Input P3 integration missing: ${marker}`);

const capabilities = text('src/lib/math/capabilities.ts');
const extendedCapabilities = text('src/lib/math/capabilitiesE5.ts');
pass(capabilities.includes('containsPiecewise(object.valueAst)'), 'piecewise base capability boundary is not enforced');
pass(capabilities.includes("new Set(['evaluate-function', 'graph'])"), 'piecewise base capability allowlist changed');
pass(extendedCapabilities.includes('containsPiecewise(object.valueAst)'), 'piecewise capability boundary must be re-enforced after E5–E11 aggregation');
pass(extendedCapabilities.includes("new Set(['evaluate-function','graph'])"), 'final piecewise capability allowlist changed');

const browser = text('tests/browser/stable-release.e2e.ts');
for (const marker of [
  'structured input wraps selections and keyboard shortcuts preserve fast entry',
  'piecewise template commits as a function with deliberately bounded capabilities',
]) pass(browser.includes(marker), `P3 browser acceptance marker missing: ${marker}`);

const accessibility = text('tests/browser/accessibility-device.e2e.ts');
pass(accessibility.includes("name: 'Math keypad'"), 'P3 accessibility suite must exercise the keypad');

const production = text('tests/production/production.live.ts');
pass(production.includes('live structured input and piecewise preview work'), 'P3 live production verification is missing');

if (failures.length) {
  console.error(`MathLab P3 input/interaction audit failed (${failures.length} issue${failures.length === 1 ? '' : 's'}):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('MathLab P3 input & interaction audit: PASS');
