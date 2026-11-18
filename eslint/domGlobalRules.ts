import type { Linter } from 'eslint';

/** The browser globals a DOM-free layer would reach first: the page, the window and the saved show. */
const DOM_GLOBALS = ['document', 'window', 'localStorage'];
const MESSAGE = 'core, domain and engine never use the DOM: the ui and app layers own the page and the storage.';

/**
 * The engine never touches the DOM (docs/rules/code.md), so it runs in Vitest without a page. The layer rules stop
 * imports of ui and render; a global needs no import, so this rule stops the DOM globals themselves.
 */
export const domGlobalRules: Linter.Config[] = [
  {
    files: ['src/core/**/*.ts', 'src/domain/**/*.ts', 'src/engine/**/*.ts'],
    rules: { 'no-restricted-globals': ['error', ...DOM_GLOBALS.map((name) => ({ name, message: MESSAGE }))] },
  },
];
