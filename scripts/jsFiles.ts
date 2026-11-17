/**
 * The all-TypeScript rule: no .js, .mjs or .cjs file in the repository. The vendored three.js copy is the one
 * exception, because the app still loads it until Phase 6 deletes vendor/.
 */
const JS_FILE = /\.(js|mjs|cjs)$/;
const ALLOWED_PREFIX = 'vendor/';

/** Returns the paths that break the rule, so the caller can list every offender in one run. */
export function findJsFiles(paths: readonly string[]): string[] {
  return paths.filter((path) => JS_FILE.test(path) && !path.startsWith(ALLOWED_PREFIX));
}
