import { expect } from '@playwright/test';
import type { StageFixturePatch } from '../mvrStageInfo';

/**
 * Checks the patches after an export and a new import against the ones before. An imported show is exported from its
 * stored original file, which changes only what the desk changed: a fixture keeps its patch, and a fixture the file
 * left unpatched (a spare) stays unpatched, because the export does not invent addresses the plot never had.
 */
export function expectPatchesKept(before: readonly StageFixturePatch[], after: readonly StageFixturePatch[]): void {
  expect(after.map((fixture) => fixture.id)).toEqual(before.map((fixture) => fixture.id));
  before.forEach((fixture, index) => {
    expect(after[index]?.patch ?? null, `fixture ${fixture.id} keeps its patch`).toEqual(fixture.patch ?? null);
  });
}
