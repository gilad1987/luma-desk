/**
 * Shared folders publish their API through index.ts; reaching past it couples callers to internals. tests/shared/e2e
 * is a second public index, so that Vitest units never load the Playwright helpers through tests/shared.
 */
export const SHARED_INTERNALS = {
  group: [
    '**/shared/*',
    '!**/shared/index',
    '!**/shared/index.ts',
    '!**/shared/e2e',
    '**/shared/e2e/*',
    '!**/shared/e2e/index',
    '!**/shared/e2e/index.ts',
  ],
  message: 'Import a shared folder through its index.ts.',
};
