import type { DmxPatch } from '../../domain/stage/DmxPatch';
import type { MvrDesignInfo } from '../../domain/stage/mvr';
import { parsePatch } from '../../domain/stage/parse/parsePatch';
import { Reader } from '../../domain/stage/parse/readers';
import type { StageFixture } from '../../domain/stage/StageDesign';
import type { MvrWarning } from '../MvrWarning';
import { assignPatches } from './assignPatches';
import { footprintOf } from './modeFootprints';
import { patchOverlaps, type PatchSpan } from './patchOverlaps';

/** The patch of every fixture of an export, and what the summary must say about it. */
export interface PatchPlan {
  readonly patches: ReadonlyMap<number, DmxPatch>;
  /** Fixtures without a patch that got an address. */
  readonly autoPatched: number;
  /** Auto-patched fixtures whose channel count is an estimate, because their GDTF mode is not known. */
  readonly estimated: number;
  /**
   * One sentence for each estimated fixture that has another patch after it in its universe. An estimate that is too
   * small puts the next fixture on its channels on a console, so these need a check; an estimate nothing follows
   * reaches nothing.
   */
  readonly crowded: readonly string[];
  /** Fixtures without a patch that got no address, because their channel count is only an estimate. */
  readonly unsized: number;
  /** Fixtures without a patch that found no room up to universe 63999 (`MAX_UNIVERSE`); they have no address. */
  readonly unplaced: number;
  /** Fixtures whose stored patch is out of range; they are written without an address. */
  readonly skipped: number;
  readonly warnings: readonly MvrWarning[];
}

/** The fixture's stored patch when it is valid, read with the show-file reader so both accept the same ranges. */
const validPatch = (fixture: StageFixture): DmxPatch | undefined =>
  fixture.patch && parsePatch(new Reader(), { patch: fixture.patch }, 'patch', '');

/** The sentences of `PatchPlan.crowded`: the estimated fixtures with any other patch after them in their universe. */
function crowdedOf(
  estimated: readonly number[],
  patches: ReadonlyMap<number, DmxPatch>,
  reserved: readonly PatchSpan[],
): string[] {
  const all = [...patches.values(), ...reserved.map((span) => span.patch)];
  return estimated.flatMap((id) => {
    const own = patches.get(id);
    if (!own || !all.some((other) => other.universe === own.universe && other.address > own.address)) return [];
    const where = `${own.universe}.${own.address}`;
    return [`Fixture ${id} at ${where} uses an estimated channel count and another patch follows it in its universe.`];
  });
}

/**
 * Keeps every fixture's valid patch and gives each unpatched fixture an address, so a console can drive the exported
 * rig at once. Assigned fixtures go into fresh universes after the highest one already used, so they never overlap a
 * kept patch. The footprint is the real channel count of the fixture's GDTF mode where known (`footprintOf`).
 * Kept patches that overlap give `patch-overlap` warnings; an out-of-range patch is skipped, not thrown on.
 * `reserved` holds addresses a file keeps that no desk fixture models; they count as used and in the overlap check.
 * `placeEstimates` is off for an export from an original file: see `assignPatches`.
 */
export function planPatches(
  fixtures: readonly StageFixture[],
  mvr: MvrDesignInfo | undefined,
  reserved: readonly PatchSpan[] = [],
  placeEstimates = true,
): PatchPlan {
  const patches = new Map<number, DmxPatch>();
  const spans = fixtures.flatMap((fixture) => {
    const patch = validPatch(fixture);
    if (patch) patches.set(fixture.id, patch);
    return patch ? [{ id: fixture.id, patch, ...footprintOf(fixture, mvr) }] : [];
  });
  const first = Math.max(0, ...[...spans, ...reserved].map((span) => span.patch.universe)) + 1;
  const open = fixtures.filter((fixture) => !fixture.patch).sort((a, b) => a.id - b.id);
  const { autoPatched, estimated, unsized } = assignPatches(open, mvr, patches, { first, placeEstimates });
  const skipped = fixtures.filter((fixture) => fixture.patch && !patches.has(fixture.id)).length;
  const counts = { autoPatched, estimated: estimated.length, unsized, unplaced: open.length - autoPatched - unsized };
  const crowded = crowdedOf(estimated, patches, reserved);
  return { patches, ...counts, crowded, skipped, warnings: patchOverlaps([...spans, ...reserved]) };
}
