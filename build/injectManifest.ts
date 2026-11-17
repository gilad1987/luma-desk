/** What the build writes into the worker: the files to cache at install and the name of the cache. */
export interface SwManifest {
  readonly shell: readonly string[];
  readonly cache: string;
}

/**
 * Replaces one placeholder global of sw.ts with a JSON literal. A missing placeholder fails the build: a worker
 * shipped with it would throw a ReferenceError on install and leave users on the old version without a sign.
 */
function replacePlaceholder(code: string, placeholder: string, value: unknown): string {
  if (!code.includes(placeholder)) throw new Error(`sw-manifest: ${placeholder} is not in the built worker`);
  return code.replaceAll(placeholder, () => JSON.stringify(value));
}

/**
 * Writes the manifest into the built worker code in place of the `__SW_SHELL__` and `__SW_CACHE__` globals that
 * sw.ts declares. The minifier keeps them, because it may not rename or drop an undeclared global.
 */
export function injectManifest(code: string, manifest: SwManifest): string {
  return replacePlaceholder(replacePlaceholder(code, '__SW_SHELL__', manifest.shell), '__SW_CACHE__', manifest.cache);
}
