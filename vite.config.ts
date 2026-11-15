import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

const runtime = globalThis as typeof globalThis & {
  process?: { env?: Record<string, string | undefined> };
};
const candidateSha = runtime.process?.env?.GITHUB_SHA ?? '';
const releaseSha = /^[a-f0-9]{40}$/.test(candidateSha) ? candidateSha : null;
const buildId = releaseSha?.slice(0, 12)
  || runtime.process?.env?.MATHLAB_BUILD_ID
  || 'local-v2.1.0';

export default defineConfig({
  plugins: [react(), {
    name: 'mathlab-release-identity',
    apply: 'build',
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'release.json',
        source: JSON.stringify({ schema: 'mathlab-release-v1', commit: releaseSha, buildId }) + '\n',
      });
    },
  }],
  base: './',
  define: {
    __MATHLAB_BUILD_ID__: JSON.stringify(buildId),
  },
  build: {
    target: 'es2022',
    sourcemap: false,
    manifest: true,
    chunkSizeWarningLimit: 900,
  },
  server: {
    host: '127.0.0.1',
  },
  preview: {
    host: '127.0.0.1',
  },
  worker: {
    format: 'es',
  },
  test: {
    environment: 'node',
    globals: true,
  },
});
