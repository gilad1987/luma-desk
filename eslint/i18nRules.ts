import type { Linter } from 'eslint';

/** Any character of the Hebrew Unicode block, so niqqud and punctuation count as well as letters. */
const HEBREW = '/[֐-׿]/';
const MESSAGE = 'Hebrew text belongs in src/i18n/he (rule I1); import it from there.';

/**
 * Rule I1 (docs/rules/docs-tests.md): the locale is the one source of user text, so a copy edit touches one file and
 * `tsc` catches a missing key. Tests stay out: a spec may assert the text it reads (T26) and oracles keep the original
 * code. It is the only `no-restricted-syntax` user, so the legacy block can turn the whole rule off for src/main.ts.
 */
export const i18nRules: Linter.Config[] = [
  {
    files: ['src/**/*.ts'],
    ignores: ['src/i18n/**'],
    rules: {
      'no-restricted-syntax': [
        'error',
        { selector: `Literal[value=${HEBREW}]`, message: MESSAGE },
        { selector: `TemplateElement[value.raw=${HEBREW}]`, message: MESSAGE },
      ],
    },
  },
];
