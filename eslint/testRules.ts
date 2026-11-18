import type { Linter } from 'eslint';

const RUNNERS = '/^(it|test|describe|suite|bench)$/';
const PARKED = '/^(skip|only|todo|fails|fixme)$/';
const MESSAGE = 'A parked or focused test hides a result: fix the bug and make it a plain it/test/describe.';

/**
 * Bans parked and focused tests (`it.fails`, `.skip`, `.todo`, `.only`, Playwright's `.fixme`), also behind one
 * modifier such as `it.concurrent.skip`. Each one turns a red result green or hides the rest of the suite, so an open
 * bug could ship with a passing run. Vitest and Playwright have no `xit`/`fit` aliases, so there is none to ban.
 * The conditional `describe.skipIf`/`it.skipIf` stay allowed: the local-only tests need them to skip when the
 * third-party files they read are absent (`skipIf` is a different property name, so the pattern does not match it).
 */
export const testRules: Linter.Config = {
  files: ['tests/**/*.ts'],
  rules: {
    'no-restricted-syntax': [
      'error',
      { selector: `MemberExpression[object.name=${RUNNERS}][property.name=${PARKED}]`, message: MESSAGE },
      { selector: `MemberExpression[object.object.name=${RUNNERS}][property.name=${PARKED}]`, message: MESSAGE },
    ],
  },
};
