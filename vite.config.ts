import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

const runtime = globalThis as typeof globalThis & {
  process?: { env?: Record<string, string | undefined> };
};
const buildId = runtime.process?.env?.GITHUB_SHA?.slice(0, 12)
  || runtime.process?.env?.MATHLAB_BUILD_ID
  || 'local-v2.1.0';

export default defineConfig({
  plugins: [react()],
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
