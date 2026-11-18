import type { Linter } from 'eslint';
import { restrictDynamicImports, type ImportRestriction } from './dynamicImports.ts';
import { HEBREW_TEXT } from './i18nRules.ts';
import { SHARED_INTERNALS } from './sharedInternals.ts';

/**
 * `src/app` is the composition root's wiring: only `src/main.ts` and `src/app` itself may import it. A file reaches it
 * through relative steps (`./app`, `../app`, `./../app`) or through the src folder (`../../src/app`); the regex covers
 * all of them. It is a regex, not a glob, because the old glob also matched package paths such as `firebase/app`. No
 * other src folder is named `app`.
 */
export const APP_WIRING: ImportRestriction = {
  regex: '^(\\.{1,2}/)+(src/)?app(/|$)',
  message: 'Only src/main.ts and src/app may import src/app.',
};

/**
 * Every src folder outside the wiring; the layer blocks after it replace it for their own folders, which is how
 * src/i18n loses the Hebrew text rule again.
 */
export const appWiringBlock: Linter.Config = {
  files: ['src/**/*.ts'],
  ignores: ['src/main.ts', 'src/app/**'],
  rules: {
    'no-restricted-imports': ['error', { patterns: [SHARED_INTERNALS, APP_WIRING] }],
    'no-restricted-syntax': ['error', ...HEBREW_TEXT, ...restrictDynamicImports([APP_WIRING])],
  },
};
