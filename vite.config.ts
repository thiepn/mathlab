import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    target: 'es2022',
    sourcemap: false,
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
