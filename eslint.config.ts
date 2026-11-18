import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';
import { codeRules } from './eslint/codeRules.ts';
import { i18nRules } from './eslint/i18nRules.ts';
import { layerRules } from './eslint/layerRules.ts';
import { SHARED_INTERNALS } from './eslint/sharedInternals.ts';

export default defineConfig(
  { ignores: ['dist/', 'test-results/', 'playwright-report/'] },
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
  codeRules,
  i18nRules,
  layerRules,
  prettier,
);
