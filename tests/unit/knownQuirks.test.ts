import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

// docs/known-quirks.md promises that `grep -rn "quirk C2" src` finds the code that keeps quirk C2 (rule D5). A new
// entry without a citation, or a citation of an entry that does not exist, breaks that promise without this test.

const root = resolve(import.meta.dirname, '../..');

/** Entries with no code left to cite, and why. Every other entry must be cited in `src/` or `sw.ts`. */
const UNCITED: Readonly<Record<string, string>> = {
  A2: 'one Executor class gives the AUTO executor `flashOnly` too, so the two shapes no longer differ',
  B1: 'the wrapper is gone: the Beam buttons call `applyPreset` directly',
  F2: 'one shared `UP` vector (src/domain/venue.ts) replaces the two copies',
  F3: 'the dead terms were left out (src/render/surface/boxHit.ts, surfacePlanes.ts)',
  F4: 'the wrong comment was corrected (src/render/lights/KeyLights.ts)',
  F8: 'the wrong count was only in a comment, which the new code does not repeat',
  G6: 'the tour code has no variable that shadows the selection',
  G7: 'no executor loop slices the list',
  G9: 'the step count is data, not odd code (pinned by tests/unit/i18n/he.test.ts)',
  I1: 'fixed by design: build/cacheName.ts hashes the shipped files',
  K1: 'test infrastructure in the index.html head, not kept behaviour',
  Q3: 'same as B1',
  Q28: 'the key and the command share `rig.lightIds()`; nothing odd is left',
  Q29: '`Selection.reverse` builds a new list instead of reversing in place',
};

const doc = readFileSync(join(root, 'docs/known-quirks.md'), 'utf8');
const entries = [...doc.matchAll(/^(?:### ([A-Z]\d+)\.|\| (Q\d+) )/gm)].map((m) => m[1] ?? m[2] ?? '');

const readTree = (folder: string): string =>
  readdirSync(join(root, folder), { recursive: true, encoding: 'utf8' })
    .filter((path) => path.endsWith('.ts'))
    .map((path) => readFileSync(join(root, folder, path), 'utf8'))
    .join('\n');
const code = readTree('src') + readTree('build') + readFileSync(join(root, 'sw.ts'), 'utf8');
const cited = new Set([...code.matchAll(/[Qq]uirk ([A-Z]\d+)\b/g)].map((m) => m[1] ?? ''));
// one or more ids, then the original line, also across a wrapped TSDoc line: `quirk D7, quirk Q33 (orig:3082)`
const CITATION = /[Qq]uirk [A-Z]\d+(?:,[\s*]+[Qq]uirk [A-Z]\d+)*(?:,|[\s*]+\()?[\s*]*orig:(?:sw\.js:)?\d+/g;
const withoutLine = [...code.replace(CITATION, '').matchAll(/[Qq]uirk [A-Z]\d+\b.{0,40}/g)].map((m) => m[0]);

const originalLines = readFileSync(join(root, 'tests/shared/legacy/original-index.html'), 'utf8')
  .trimEnd()
  .split('\n').length;
/** Lines of `sw.js` at commit 48a3b63, the worker the `orig:sw.js:<n>` citations point into. */
const SW_JS_LINES = 26;
const outOfRange = [...code.matchAll(/orig:(sw\.js:)?(\d+(?:-\d+)?(?:, \d+)*)/g)].filter((m) =>
  (m[2] ?? '').split(/[-, ]+/).some((n) => Number(n) < 1 || Number(n) > (m[1] ? SW_JS_LINES : originalLines)),
);

describe('docs/known-quirks.md citations', () => {
  it('reads every entry of the file', () => {
    expect(entries.length).toBeGreaterThan(100);
    expect(new Set(entries).size).toBe(entries.length);
  });

  it('finds a `quirk <id>` comment for every entry whose code is kept', () => {
    expect(entries.filter((id) => !(id in UNCITED) && !cited.has(id))).toEqual([]);
  });

  it('gives the original line with every citation', () => {
    expect(withoutLine).toEqual([]);
  });

  it('cites original lines that exist', () => {
    expect(outOfRange.map((m) => m[0])).toEqual([]);
  });

  it('cites only entries that exist', () => {
    expect([...cited].filter((id) => !entries.includes(id))).toEqual([]);
  });

  it('exempts only entries that exist and are not cited', () => {
    expect(Object.keys(UNCITED).filter((id) => !entries.includes(id) || cited.has(id))).toEqual([]);
  });
});
