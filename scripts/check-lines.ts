// `npm run check:lines`: fails when a .css or .glsl file under src/ or build/ is over the line limit.
// Node runs this file directly (built-in type stripping), so the import keeps its .ts extension.
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { MAX_FILE_LINES, findOversizedFiles, type SourceFile } from './lineLimit.ts';

const ROOTS = ['src', 'build'];

function readSourceFiles(root: string): SourceFile[] {
  if (!existsSync(root)) return [];
  return readdirSync(root, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => join(entry.parentPath, entry.name))
    .map((path) => ({ path, text: readFileSync(path, 'utf8') }));
}

const oversized = findOversizedFiles(ROOTS.flatMap(readSourceFiles));
for (const file of oversized) {
  console.error(`${file.path}: ${file.lines} lines (max ${MAX_FILE_LINES})`);
}
if (oversized.length > 0) process.exit(1);
console.log(`check:lines: every .css and .glsl file under ${ROOTS.join('/ and ')}/ is within ${MAX_FILE_LINES} lines`);
