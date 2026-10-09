import { defineConfig } from 'vitest/config';
import path from 'node:path';

// The calc engine is pure, so tests run in node — no DOM needed.
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
});
