import type { Linter } from 'eslint';
import { SHARED_INTERNALS } from './sharedInternals.ts';

/**
 * `src/app` is the composition root's wiring: only `src/main.ts` and `src/app` itself may import it. A file under
 * `src/<area>/` reaches it through `../` steps, and a new file directly under `src/` would use `./app`; the regex
 * covers both. It is a regex, not a glob, because the old glob also matched package paths such as `firebase/app`. No
 * other src folder is named `app`.
 */
export const APP_WIRING = {
  regex: '^(\\./|(\\.\\./)+)app(/|$)',
  message: 'Only src/main.ts and src/app may import src/app.',
};

/** Every src folder outside the wiring; the layer blocks after it replace it for their own folders. */
export const appWiringBlock: Linter.Config = {
  files: ['src/**/*.ts'],
  ignores: ['src/main.ts', 'src/app/**'],
  rules: { 'no-restricted-imports': ['error', { patterns: [SHARED_INTERNALS, APP_WIRING] }] },
};
