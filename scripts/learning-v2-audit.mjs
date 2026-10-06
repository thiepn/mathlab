import { readFile } from 'node:fs/promises';

const requiredFiles = [
  'src/app/learningModel.ts',
  'src/app/components/LearningPathPanel.tsx',
  'src/app/components/PracticePageM6.tsx',
  'src/styles/p5.css',
  'tests/learningModel.test.ts',
  'docs/P5_LEARNING_V2.md',
  'docs/ROADMAP.md',
  'package.json',
  '.github/workflows/ci.yml',
  '.github/workflows/deploy.yml',
];

const files = new Map();
for (const path of requiredFiles) {
  files.set(path, await readFile(path, 'utf8'));
}

const failures = [];

function requireText(path, needle, message) {
  if (!files.get(path)?.includes(needle)) failures.push(message + ' (' + path + ')');
}

requireText('src/app/learningModel.ts', 'export const LEARNING_CONCEPTS', 'Learning concepts are not exported');
requireText('src/app/learningModel.ts', 'learningCoverageForCourse', 'Engine curriculum coverage is missing');
requireText('src/app/learningModel.ts', 'buildGuidedConceptSession', 'Concept-guided practice builder is missing');
requireText('src/app/learningModel.ts', 'workedExample', 'Worked examples are missing');
requireText('src/app/components/LearningPathPanel.tsx', 'LEARNING_STAGES', 'Learn/example/guided/independent stages are not surfaced');
requireText('src/app/components/LearningPathPanel.tsx', 'Start guided practice', 'Guided-practice entry point is missing');
requireText('src/app/components/PracticePageM6.tsx', 'LearningPathPanel', 'Practice does not consume the P5 learning path');
requireText('src/app/components/PracticePageM6.tsx', 'buildGuidedConceptSession', 'Practice does not start concept-scoped sessions');
requireText('src/styles/p5.css', '.p5-learning-path', 'P5 learning-path styles are missing');
requireText('tests/learningModel.test.ts', 'maps every deterministic course capability', 'P5 engine-parity regression is missing');
requireText('docs/ROADMAP.md', '| **P5 — Learning v2** |', 'Roadmap does not record the P5 phase');
requireText('docs/ROADMAP.md', '| **P5 — Learning v2** | Concept/course model, worked examples, guided practice and current-engine curriculum parity. | **Complete** |', 'Roadmap does not mark P5 complete');
requireText('package.json', '"audit:learning"', 'Package scripts do not expose the P5 audit');
requireText('package.json', 'npm run audit:learning', 'Release gate does not execute the P5 audit');
requireText('.github/workflows/ci.yml', 'npm run audit:learning', 'Pull-request CI does not execute the P5 audit');
requireText('.github/workflows/deploy.yml', 'npm run audit:learning', 'Deployment CI does not execute the P5 audit');

if (failures.length) {
  console.error('P5 Learning v2 audit failed:');
  for (const failure of failures) console.error('- ' + failure);
  process.exit(1);
}

console.log('P5 Learning v2 audit passed.');
