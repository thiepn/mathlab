import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig(() => {
  const buildId = process.env.GITHUB_SHA?.slice(0, 12) || process.env.MATHLAB_BUILD_ID || 'local-v2.0.0';
  return {
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
  };
});
