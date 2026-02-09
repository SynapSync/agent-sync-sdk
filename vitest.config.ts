import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    globals: true,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/**/__generated__/**', 'src/**/index.ts'],
      thresholds: {
        statements: 85,
        branches: 80,
        functions: 85,
      },
    },
  },
});
