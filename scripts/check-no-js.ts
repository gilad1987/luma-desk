// `npm run check:no-js`: fails when git tracks a .js, .mjs or .cjs file outside vendor/ (the all-TypeScript rule).
// Node runs this file directly (built-in type stripping), so the import keeps its .ts extension.
import { execFileSync } from 'node:child_process';
import { findJsFiles, readTrackedFiles } from './jsFiles.ts';

// tracked and staged paths, so the pre-commit hook sees a new file before it is committed
let tracked: string[];
try {
  // git's own stderr is not shown: the caught error prints the one line that says what is missing
  const runLsFiles = (): string => execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8', stdio: 'pipe' });
  tracked = readTrackedFiles(runLsFiles);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
const offenders = findJsFiles(tracked);
for (const path of offenders) {
  console.error(`${path}: JavaScript file; write it in TypeScript`);
}
if (offenders.length > 0) process.exit(1);
console.log(`check:no-js: no tracked .js, .mjs or .cjs file outside vendor/ (${tracked.length} files checked)`);
