// `npm run check:no-js`: fails when git tracks a .js, .mjs or .cjs file outside vendor/ (the all-TypeScript rule).
// Node runs this file directly (built-in type stripping), so the import keeps its .ts extension.
import { execFileSync } from 'node:child_process';
import { findJsFiles } from './jsFiles.ts';

// tracked and staged paths, so the pre-commit hook sees a new file before it is committed
const tracked = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' }).split('\0').filter(Boolean);
const offenders = findJsFiles(tracked);
for (const path of offenders) {
  console.error(`${path}: JavaScript file; write it in TypeScript`);
}
if (offenders.length > 0) process.exit(1);
console.log(`check:no-js: no tracked .js, .mjs or .cjs file outside vendor/ (${tracked.length} files checked)`);
