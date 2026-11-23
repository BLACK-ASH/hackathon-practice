import path from 'node:path';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

const appRoot = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(appRoot, '..');

export default defineConfig({
  base: './',
  plugins: [react()],
  resolve: {
    alias: {
      '#core': path.join(repoRoot, 'modules/core/src'),
      '#contracts': path.join(repoRoot, 'shared/contracts'),
      '#types': path.join(repoRoot, 'shared/types'),
      '#mocks': path.join(repoRoot, 'shared/mocks'),
    },
  },
  server: {
    fs: {
      allow: [repoRoot],
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
  },
});
