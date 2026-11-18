import type { Linter } from 'eslint';

/** Any character of the Hebrew Unicode block, so niqqud and punctuation count as well as letters. */
const HEBREW = '/[֐-׿]/';
const MESSAGE = 'Hebrew text belongs in src/i18n/he (rule I1); import it from there.';

/**
 * The rule I1 entries of `no-restricted-syntax`. A later block that sets the same rule replaces these entries, so
 * `eslint/layerRules.ts` repeats them in its blocks.
 */
export const HEBREW_TEXT = [
  { selector: `Literal[value=${HEBREW}]`, message: MESSAGE },
  // `cooked` holds the decoded text, so an escaped `א` counts; `raw` covers a tagged template whose
  // invalid escape leaves `cooked` null.
  { selector: `TemplateElement:matches([value.cooked=${HEBREW}], [value.raw=${HEBREW}])`, message: MESSAGE },
];

/**
 * Rule I1 (docs/rules/docs-tests.md): the locale is the one source of user text, so a copy edit touches one file and
 * `tsc` catches a missing key. Tests stay out: a spec may assert the text it reads (T26) and oracles keep the original
 * code.
 */
export const i18nRules: Linter.Config[] = [
  {
    files: ['src/**/*.ts'],
    ignores: ['src/i18n/**'],
    rules: { 'no-restricted-syntax': ['error', ...HEBREW_TEXT] },
  },
];
