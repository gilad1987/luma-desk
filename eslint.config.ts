import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';
import { SHARED_INTERNALS, layerRules } from './eslint/layerRules.ts';
import { testRules } from './eslint/testRules.ts';

/**
 * Files still in their pre-refactor shape: the untyped app script (`// @ts-nocheck`), far over the line limit. Each
 * phase moves code out of it. This list must be empty by Phase 6 and nothing may be added to it.
 */
const LEGACY_UNTIL_PHASE_6 = ['src/main.ts'];

export default defineConfig(
  { ignores: ['dist/', 'test-results/', 'playwright-report/', 'vendor/', '.cache/'] },
  {
    files: ['**/*.ts'],
    extends: [js.configs.recommended, tseslint.configs.recommendedTypeChecked],
    languageOptions: { parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname } },
    rules: {
      'max-lines': ['error', { max: 100, skipBlankLines: false, skipComments: false }],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-non-null-assertion': 'error',
      'no-restricted-imports': ['error', { patterns: [SHARED_INTERNALS] }],
    },
  },
  layerRules(),
  testRules,
  {
    files: LEGACY_UNTIL_PHASE_6,
    extends: [tseslint.configs.disableTypeChecked],
    // the rules the moved, unchanged code breaks today; the extraction phases fix them instead of copying them
    rules: {
      'max-lines': 'off',
      '@typescript-eslint/ban-ts-comment': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-unused-expressions': 'off',
      'no-empty': 'off',
      'prefer-const': 'off',
    },
  },
  prettier,
);
