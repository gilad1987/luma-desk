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

/**
 * Splits the `git ls-files -z` output that `runLsFiles` returns. The runner is injected so a test can make git fail.
 * @throws Error when git cannot list the files (a git-archive copy has no .git/), so the script prints one clear
 * line instead of Node's stack trace with git's own message.
 */
export function readTrackedFiles(runLsFiles: () => string): string[] {
  let output: string;
  try {
    output = runLsFiles();
  } catch {
    throw new Error('check:no-js needs a git checkout (git ls-files)');
  }
  return output.split('\0').filter(Boolean);
}
