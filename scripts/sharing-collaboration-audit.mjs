import { readFile } from 'node:fs/promises';

const requiredFiles = [
  'src/lib/share/snapshot.ts',
  'src/app/components/ShareSnapshotDialog.tsx',
  'src/app/components/SharedSnapshotPage.tsx',
  'src/app/hooks/useHashRoute.ts',
  'src/app/hooks/useMathWorkspace.ts',
  'src/app/hooks/useWorksheet.ts',
  'src/app/components/Workspace.tsx',
  'src/app/App.tsx',
  'src/styles/p8.css',
  'src/main.tsx',
  'tests/sharingCollaboration.test.ts',
  'tests/browser/sharing-collaboration.e2e.ts',
  'docs/P8_SHARING_COLLABORATION.md',
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

requireText('src/lib/share/snapshot.ts', "format: 'mathlab-share'", 'Share format contract is missing');
requireText('src/lib/share/snapshot.ts', "crypto.subtle.digest('SHA-256'", 'SHA-256 integrity is missing');
requireText('src/lib/share/snapshot.ts', 'MAX_SHARE_LINK_TOKEN = 24_000', 'Conservative URL share bound is missing');
requireText('src/lib/share/snapshot.ts', 'parseWorkspaceImport', 'Shared workspaces do not use the canonical import validator');
requireText('src/lib/share/snapshot.ts', 'parseWorksheetImport', 'Shared worksheets do not use the canonical import validator');
requireText('src/app/components/ShareSnapshotDialog.tsx', 'Create a read-only snapshot', 'Share creation surface is missing');
requireText('src/app/components/SharedSnapshotPage.tsx', 'Copy into my MathLab', 'Explicit local-copy boundary is missing');
requireText('src/app/components/SharedSnapshotPage.tsx', 'SHA-256 verified', 'Verified provenance is not exposed');
requireText('src/app/hooks/useHashRoute.ts', "'share'", 'Share route is not registered');
requireText('src/app/hooks/useMathWorkspace.ts', 'importSharedCopy', 'Shared workspace copy path is missing');
requireText('src/app/hooks/useWorksheet.ts', 'appendSharedSession', 'Shared worksheet isolation path is missing');
requireText('src/app/components/Workspace.tsx', 'ShareSnapshotDialog', 'Workspace share entry point is missing');
requireText('src/app/App.tsx', 'SharedSnapshotPage', 'Read-only share route is not mounted');
requireText('src/styles/p8.css', '.p8-shared-page', 'P8 sharing styles are missing');
requireText('src/main.tsx', "./styles/p8.css", 'P8 stylesheet is not loaded');
requireText('tests/sharingCollaboration.test.ts', "describe('P8 sharing snapshot'", 'P8 unit certification is missing');
requireText('tests/browser/sharing-collaboration.e2e.ts', 'P8 share links open as verified read-only mathematical snapshots', 'P8 browser acceptance is missing');
requireText('docs/ROADMAP.md', '| **P8 — Sharing & collaboration** | Immutable share snapshots, read-only review, integrity verification and explicit local-copy collaboration. | **Complete** |', 'Roadmap does not mark P8 complete');
requireText('package.json', '"audit:sharing"', 'Package scripts do not expose the P8 audit');
requireText('package.json', 'npm run audit:sharing', 'Release aggregate does not execute the P8 audit');
requireText('.github/workflows/ci.yml', 'npm run audit:sharing', 'PR CI does not execute the P8 audit');
requireText('.github/workflows/deploy.yml', 'npm run audit:sharing', 'Deployment CI does not execute the P8 audit');

if (failures.length) {
  console.error('P8 Sharing & Collaboration audit failed:');
  for (const failure of failures) console.error('- ' + failure);
  process.exit(1);
}
console.log('P8 Sharing & Collaboration audit passed.');
