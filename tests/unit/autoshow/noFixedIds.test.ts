import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/** The folders that must follow the current stage instead of the built-in id plan (plan §8, check 4). */
const FOLDERS = ['src/autoshow', 'src/show/demo'];

/** Every .ts file under `dir`, recursively. */
function tsFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const path = join(dir, e.name);
    if (e.isDirectory()) return tsFiles(path);
    return e.name.endsWith('.ts') ? [path] : [];
  });
}

describe('Auto Show and the demo show', () => {
  it('name no fixed fixture id: no LED screen id 2001 and no id range', () => {
    const hits = FOLDERS.flatMap(tsFiles).filter((file) => /\b2001\b|\.range\(/.test(readFileSync(file, 'utf8')));
    expect(hits).toEqual([]);
  });
});
