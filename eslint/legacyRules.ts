import type { Linter } from 'eslint';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';

/**
 * Files still in their pre-refactor shape: the untyped app script (`// @ts-nocheck`), far over the line limit. Each
 * phase moves code out of it. This list must be empty by Phase 6 and nothing may be added to it.
 */
const LEGACY_UNTIL_PHASE_6 = ['src/main.ts'];

/**
 * Turns off, for the legacy files only, the rules the moved, unchanged code breaks today; the extraction phases fix
 * them instead of copying them. It must stay after every block that sets a type-aware rule (see codeRules.ts).
 */
export const legacyRules: Linter.Config[] = defineConfig({
  files: LEGACY_UNTIL_PHASE_6,
  extends: [tseslint.configs.disableTypeChecked],
  rules: {
    'max-lines': 'off',
    '@typescript-eslint/ban-ts-comment': 'off',
    '@typescript-eslint/no-unused-vars': 'off',
    '@typescript-eslint/no-unused-expressions': 'off',
    'no-empty': 'off',
    'prefer-const': 'off',
    '@typescript-eslint/max-params': 'off',
    'max-lines-per-function': 'off',
    'max-depth': 'off',
    'no-nested-ternary': 'off',
  },
});
