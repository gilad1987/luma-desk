import type { Linter } from 'eslint';

/**
 * Only `src/ui/builder/wa/` imports Web Awesome (docs/adr/0006): one folder holds the chunk boundary, so the
 * components never reach the desk's main chunk and an upgrade touches one place. It uses the typescript-eslint copy
 * of `no-restricted-imports` on purpose: a later entry for a rule replaces the earlier one in a flat config, so the
 * core rule here would drop the layer, wiring and shared-folder patterns of the blocks before it. A dynamic
 * `import()` of the package is not covered; `no-restricted-syntax` has the same replace problem.
 */
export const waBoundary: Linter.Config = {
  files: ['src/**/*.ts', 'tests/**/*.ts', 'build/**/*.ts', 'sw.ts'],
  ignores: ['src/ui/builder/wa/**'],
  rules: {
    '@typescript-eslint/no-restricted-imports': [
      'error',
      {
        patterns: [
          {
            group: ['@awesome.me/webawesome', '@awesome.me/webawesome/*'],
            message: 'Only src/ui/builder/wa/ imports Web Awesome (docs/adr/0006).',
          },
        ],
      },
    ],
  },
};
