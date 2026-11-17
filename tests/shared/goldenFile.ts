import { expect, test } from '@playwright/test';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const GOLDEN_DIR = join(import.meta.dirname, '..', 'golden');

/**
 * Rounds every number, so that a golden does not depend on the last bits of a float. It also turns -0 into 0,
 * because JSON cannot store -0 and a golden read back from disk always has 0.
 */
export function roundNumbers(v: unknown, digits = 6): unknown {
  if (typeof v === 'number') return Number.isFinite(v) ? +v.toFixed(digits) || 0 : String(v);
  if (Array.isArray(v)) return v.map((x) => roundNumbers(x, digits));
  if (v && typeof v === 'object') {
    return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, roundNumbers(x, digits)]));
  }
  return v;
}

/**
 * Deep-compares `actual` with tests/golden/<name>.json. It acts like a Playwright snapshot: a missing golden is
 * written and the test fails, and `--update-snapshots` writes it again.
 */
export function expectGolden(name: string, actual: unknown): void {
  const file = join(GOLDEN_DIR, `${name}.json`);
  const data = roundNumbers(actual);
  const mode = test.info().config.updateSnapshots;
  const update = mode === 'all' || mode === 'changed';
  if (update || !existsSync(file)) {
    const missing = !existsSync(file);
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, JSON.stringify(data, null, 1) + '\n');
    if (missing && !update) throw new Error(`golden ${name}.json was missing; it is written now, run again`);
    return;
  }
  expect(data).toEqual(JSON.parse(readFileSync(file, 'utf8')));
}
