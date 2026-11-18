// `npm run check:lines`: fails when a .css, .scss, .glsl, .html or .yml file under ROOTS is over the line limit.
// Node runs this file directly (built-in type stripping), so the import keeps its .ts extension.
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, sep } from 'node:path';
import { MAX_FILE_LINES, findOversizedFiles, isLineChecked, type SourceFile } from './lineLimit.ts';

/** The folders and single files the repo writes by hand; a folder is scanned with all its subfolders. */
const ROOTS = ['src', 'build', 'tests', '.github/workflows', 'index.html'];

/**
 * Recorded baselines and the original page, the same paths `.prettierignore` skips: the parity suite compares them
 * byte for byte, so they keep their size whatever their extension.
 */
const FROZEN_PATHS = [
  join('tests', 'golden'),
  join('tests', 'fixtures'),
  join('tests', 'e2e', '__screenshots__'),
  join('tests', 'shared', 'legacy', 'original-index.html'),
];

function isFrozen(path: string): boolean {
  return FROZEN_PATHS.some((frozen) => path === frozen || path.startsWith(frozen + sep));
}

function listFiles(root: string): string[] {
  if (!existsSync(root)) return [];
  if (statSync(root).isFile()) return [root];
  return readdirSync(root, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => join(entry.parentPath, entry.name));
}

const files: SourceFile[] = ROOTS.flatMap(listFiles)
  .filter((path) => isLineChecked(path) && !isFrozen(path))
  .map((path) => ({ path, text: readFileSync(path, 'utf8') }));

const oversized = findOversizedFiles(files);
for (const file of oversized) {
  console.error(`${file.path}: ${file.lines} lines (max ${MAX_FILE_LINES})`);
}
if (oversized.length > 0) process.exit(1);
console.log(`check:lines: every checked file under ${ROOTS.join(', ')} is within ${MAX_FILE_LINES} lines`);
