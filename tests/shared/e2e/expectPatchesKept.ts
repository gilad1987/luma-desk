import { expect } from '@playwright/test';
import type { StageFixturePatch } from '../deskApi';

/**
 * Checks the patches after an export and a new import against the ones before. A fixture that had a patch keeps it.
 * Export MVR patches every unpatched fixture, so a console can drive the rig at once, in fresh universes above the
 * highest one in use; so a fixture without a patch before has one after, in a universe above that one.
 */
export function expectPatchesKept(before: readonly StageFixturePatch[], after: readonly StageFixturePatch[]): void {
  expect(after.map((fixture) => fixture.id)).toEqual(before.map((fixture) => fixture.id));
  const highest = Math.max(0, ...before.map((fixture) => fixture.patch?.universe ?? 0));
  before.forEach((fixture, index) => {
    const patch = after[index]?.patch ?? null;
    if (fixture.patch) expect(patch, `fixture ${fixture.id} keeps its patch`).toEqual(fixture.patch);
    else expect(patch?.universe ?? 0, `fixture ${fixture.id} is patched on export`).toBeGreaterThan(highest);
  });
}
