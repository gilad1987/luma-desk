import { expect, test } from '@playwright/test';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { goldenPath } from '../goldenPath';
import { jsonRoundTrip } from '../jsonRoundTrip';
import { readGolden } from '../readGolden';
import { roundNumbers } from '../roundNumbers';

/**
 * Compares `actual` with tests/golden/<name>.json. It acts like a Playwright snapshot: a missing golden is written
 * and the test fails, and `--update-snapshots` writes it again. Both sides go through JSON and toStrictEqual, so a
 * field that appears, disappears or changes type fails, not only a changed value.
 */
export function expectGolden(name: string, actual: unknown): void {
  const file = goldenPath(name);
  const data = jsonRoundTrip(roundNumbers(actual));
  const mode = test.info().config.updateSnapshots;
  const update = mode === 'all' || mode === 'changed';
  if (update || !existsSync(file)) {
    const missing = !existsSync(file);
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, JSON.stringify(data, null, 1) + '\n');
    if (missing && !update) throw new Error(`golden ${name}.json was missing; it is written now, run again`);
    return;
  }
  expect(data).toStrictEqual(readGolden(name));
}
