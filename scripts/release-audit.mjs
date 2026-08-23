import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const failures = [];
const pass = (condition, message) => { if (!condition) failures.push(message); };
const text = (path) => readFileSync(join(root, path), 'utf8');

const pkg = JSON.parse(text('package.json'));
pass(pkg.version === '2.0.0-rc.1', 'package version must be 2.0.0-rc.1');
pass(pkg.engines?.node === '^20.19.0 || >=22.12.0', 'Node engine must match the supported Vite 7 runtime floor');
pass(pkg.devDependencies?.vite === '7.3.5', 'Vite must stay pinned to the security-patched 7.3.5 release');
pass(pkg.devDependencies?.vitest === '3.2.7', 'Vitest must stay pinned to the security-patched 3.2.7 release');
for (const [groupName, group] of Object.entries({ dependencies: pkg.dependencies ?? {}, devDependencies: pkg.devDependencies ?? {} })) {
  for (const [name, version] of Object.entries(group)) pass(/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(String(version)), `${groupName}.${name} must be pinned to an exact release version`);
}

for (const file of ['public/manifest.webmanifest','public/sw.js','public/mathlab-mark.svg','public/mathlab-icon-192.png','public/mathlab-icon-512.png','public/mathlab-maskable-512.png','public/apple-touch-icon.png','docs/P15_ACCEPTANCE.md','docs/RELEASE_CERTIFICATION.md','docs/SECURITY_REVIEW.md']) {
  pass(existsSync(join(root, file)), `missing release artifact: ${file}`);
}

for (const [file, min] of [['public/mathlab-icon-192.png', 1000], ['public/mathlab-icon-512.png', 2000], ['public/mathlab-maskable-512.png', 2000], ['public/apple-touch-icon.png', 1000]]) {
  if (existsSync(join(root, file))) pass(statSync(join(root, file)).size >= min, `${file} appears empty or corrupt`);
}

const manifest = JSON.parse(text('public/manifest.webmanifest'));
pass(Array.isArray(manifest.icons) && manifest.icons.some((icon) => icon.sizes === '192x192'), 'manifest lacks 192x192 icon');
pass(Array.isArray(manifest.icons) && manifest.icons.some((icon) => icon.sizes === '512x512' && String(icon.purpose).includes('any')), 'manifest lacks 512x512 any-purpose icon');
pass(Array.isArray(manifest.icons) && manifest.icons.some((icon) => icon.sizes === '512x512' && String(icon.purpose).includes('maskable')), 'manifest lacks padded maskable icon');
pass(manifest.scope === './', 'manifest scope must stay relative for subpath hosting');
pass(manifest.start_url === './' && manifest.id === './', 'manifest start_url/id must remain relative and stable for subpath installs');

const sw = text('public/sw.js');
pass(sw.includes("url.origin !== self.location.origin"), 'service worker must reject cross-origin runtime caching');
pass(sw.includes("event.request.mode === 'navigate'"), 'service worker must handle navigation fallback explicitly');
pass(sw.includes("response.ok") && sw.includes("response.type !== 'basic'"), 'service worker must only runtime-cache successful same-origin basic responses');

const index = text('index.html');
pass(index.includes('apple-touch-icon'), 'index.html lacks apple-touch icon');
pass(index.includes('manifest.webmanifest'), 'index.html lacks manifest');
pass(index.includes('name="referrer"') && index.includes('no-referrer'), 'index.html lacks release referrer policy');

const viteConfig = text('vite.config.ts');
pass(viteConfig.includes("sourcemap: false"), 'production source maps must be disabled for the release archive');
pass(viteConfig.includes("host: '127.0.0.1'"), 'Vite dev/preview host must default to loopback');

const app = text('src/app/App.tsx');
pass(app.includes('skip-link'), 'app lacks keyboard skip link');
pass(app.includes('navigator.onLine'), 'app lacks online/offline state');
const header = text('src/app/components/Header.tsx');
pass(header.includes('v2.0 RC1'), 'header must identify the build as v2.0 RC1 rather than stable v2.0');
pass(header.includes('v2.0.0-rc.1'), 'header release-candidate title must match the package version');

const main = text('src/main.tsx');
pass(main.includes('AppErrorBoundary'), 'app lacks top-level error boundary');

const worker = text('src/lib/worker/client.ts');
pass(worker.includes('30_000'), 'worker client lacks release timeout');
pass(worker.includes("worker.addEventListener('error'"), 'worker client lacks crash listener');

const storage = text('src/lib/storage/workspace.ts');
pass(storage.includes("workspace:p15:default"), 'workspace P15 storage key missing');
pass(storage.includes('MAX_IMPORT_BYTES'), 'workspace import size guard missing');
pass(storage.includes('RECOVERY_KEY'), 'workspace recovery snapshot missing');

const practice = text('src/lib/storage/practice.ts');
pass(practice.includes("practice:p15:default"), 'practice P15 storage key missing');
pass(practice.includes('RECOVERY_KEY'), 'practice recovery snapshot missing');

function walk(dir, relative = '') {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const rel = relative ? `${relative}/${entry.name}` : entry.name;
    if (entry.isDirectory()) return [rel, ...walk(join(dir, entry.name), rel)];
    return [rel];
  });
}
const entries = walk(root);

const executableSources = entries.filter((path) => /^(src\/).+\.(ts|tsx|js)$/.test(path));
for (const path of executableSources) {
  const source = text(path);
  pass(!/\beval\s*\(/.test(source), `dynamic eval is forbidden in release source: ${path}`);
  pass(!/new\s+Function\s*\(/.test(source), `dynamic Function constructor is forbidden: ${path}`);
  pass(!/\bfetch\s*\(/.test(source), `application source contains a remote/network fetch path: ${path}`);
  pass(!/XMLHttpRequest/.test(source), `application source contains XMLHttpRequest: ${path}`);
}

for (const path of entries) {
  const name = path.split('/').at(-1) ?? path;
  pass(!path.split('/').includes('node_modules'), `release package contains node_modules: ${path}`);
  pass(!path.split('/').includes('dist'), `release package contains dist output: ${path}`);
  pass(!name.endsWith('.tsbuildinfo'), `release package contains TypeScript build state: ${path}`);
  pass(!['package-lock.json','yarn.lock','pnpm-lock.yaml'].includes(name), `release package contains generated lockfile: ${path}`);
}

if (failures.length) {
  console.error(`Release audit failed (${failures.length} issue${failures.length === 1 ? '' : 's'}):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('MathLab release audit: PASS');
