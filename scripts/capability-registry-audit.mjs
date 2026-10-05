import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const failures = [];
const pass = (condition, message) => { if (!condition) failures.push(message); };
const read = (path) => readFileSync(join(root, path), 'utf8');

for (const file of [
  'src/app/capabilityRegistry.ts',
  'tests/capabilityRegistry.test.ts',
  'docs/P4_UNIFIED_CAPABILITY_ARCHITECTURE.md',
]) pass(existsSync(join(root, file)), `missing P4 registry artifact: ${file}`);

const registry = read('src/app/capabilityRegistry.ts');
for (const marker of [
  'CAPABILITY_REGISTRY',
  'resolveCapabilitiesForObject',
  'preferredCapabilitiesForObject',
  'capabilitiesForCourse',
  'searchCapabilities',
  'capabilityRegistryIntegrity',
  'runtimeRegistryGaps',
  'needsConfiguration',
  'preferredRank',
  'courseIds',
]) pass(registry.includes(marker), `canonical registry contract missing: ${marker}`);

const publicConsumers = [
  'src/app/App.tsx',
  'src/app/components/WorkspaceActions.tsx',
  'src/app/components/ContextPanel.tsx',
  'src/app/components/ToolsPage.tsx',
  'src/app/components/CommandPalette.tsx',
  'src/app/components/CourseReferencePageM6.tsx',
  'src/app/components/PracticePageM6.tsx',
];

for (const file of publicConsumers) {
  const source = read(file);
  pass(source.includes('capabilityRegistry'), `${file} must consume the unified capability registry`);
  pass(!source.includes("from '../allToolCatalog'") && !source.includes("from './allToolCatalog'"), `${file} still reads the legacy all-tool catalog`);
  pass(!source.includes('capabilitiesE5'), `${file} still reads runtime capability metadata directly`);
  pass(!source.includes('toolSearchText'), `${file} still owns legacy tool search metadata`);
  pass(!source.includes('toolNeedsConfiguration'), `${file} still owns legacy tool configuration policy`);
}

const compatibilityCatalog = read('src/app/allToolCatalog.ts');
pass(compatibilityCatalog.includes('CAPABILITY_REGISTRY'), 'legacy allToolCatalog must delegate to the canonical registry');

const learning = read('src/app/learningSurfaces.ts');
pass(learning.includes('COURSE_CAPABILITY_CATEGORIES'), 'legacy course-tool mapping must delegate to registry course ownership');

const toolsTest = read('tests/toolsDiscovery.test.ts');
pass(toolsTest.includes('CAPABILITY_REGISTRY'), 'tool discovery tests must certify the registry rather than the legacy catalog');

const browser = read('tests/browser/stable-release.e2e.ts');
pass(browser.includes('unified capability registry keeps Workspace, Tools, Search, Reference and Practice aligned'), 'P4 cross-surface browser parity test is missing');

const production = read('tests/production/production.live.ts');
pass(production.includes('live unified capability registry keeps Tools and Reference search aligned'), 'P4 live production registry verification is missing');

if (failures.length) {
  console.error(`MathLab P4 unified capability audit failed (${failures.length} issue${failures.length === 1 ? '' : 's'}):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('MathLab P4 unified capability architecture audit: PASS');
