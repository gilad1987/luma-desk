/**
 * Subfolders of a shared folder that publish their own index.ts. tests/shared/e2e keeps Vitest units from loading the
 * Playwright helpers through tests/shared; dom and legacy are the Vitest DOM fakes and the frozen markup oracles.
 */
const PUBLIC_SUBFOLDERS = ['e2e', 'dom', 'legacy'];

/** Shared folders publish their API through index.ts; reaching past it couples callers to internals. */
export const SHARED_INTERNALS = {
  group: [
    '**/shared/*',
    '!**/shared/index',
    '!**/shared/index.ts',
    ...PUBLIC_SUBFOLDERS.flatMap((folder) => [
      `!**/shared/${folder}`,
      `**/shared/${folder}/*`,
      `!**/shared/${folder}/index`,
      `!**/shared/${folder}/index.ts`,
    ]),
  ],
  message: 'Import a shared folder through its index.ts.',
};
