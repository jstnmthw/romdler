import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json-summary'],
      exclude: [
        'node_modules/**',
        'tests/**',
        'dist/**',
        // Exclude UI module (console output, hard to unit test)
        'src/ui/**',
        // Exclude main entry point (integration-level)
        'src/index.ts',
        // Exclude type-only files
        'src/types/**',
        'src/**/types.ts',
      ],
      thresholds: {
        statements: 98,
        branches: 92,
        functions: 100,
        lines: 98,
      },
    },
  },
});
