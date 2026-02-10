import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'text-summary', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/__generated__/**',
        'src/**/index.ts',
        'src/types/agent.ts',       // pure interfaces
        'src/types/events.ts',       // pure interfaces
        'src/types/install.ts',      // pure interfaces
        'src/types/operations.ts',   // pure interfaces
        'src/types/source.ts',       // pure interfaces
        'src/operations/context.ts', // pure interface
        'src/fs/node.ts',           // thin Node.js wrapper, tested via E2E
      ],
      thresholds: {
        statements: 85,
        branches: 80,
        functions: 85,
        lines: 85,
      },
    },
  },
});
