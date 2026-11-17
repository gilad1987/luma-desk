/** Shared folders publish their API through index.ts; reaching past it couples callers to internals. */
export const SHARED_INTERNALS = {
  group: ['**/shared/*', '!**/shared/index', '!**/shared/index.ts'],
  message: 'Import a shared folder through its index.ts.',
};
