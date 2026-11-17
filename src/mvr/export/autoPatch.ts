import type { DmxPatch } from '../../domain/stage/DmxPatch';
import type { MvrDesignInfo } from '../../domain/stage/mvr';
import { MAX_UNIVERSE, parsePatch, UNIVERSE_CHANNELS } from '../../domain/stage/parse/parsePatch';
import { Reader } from '../../domain/stage/parse/readers';
import type { StageFixture } from '../../domain/stage/StageDesign';
import type { MvrWarning } from '../MvrWarning';
import { gdtfIdentity } from './gdtfIdentity';
import { footprintOf } from './modeFootprints';
import { patchOverlaps } from './patchOverlaps';

/** The patch of every fixture of an export, and what the summary must say about it. */
export interface PatchPlan {
  readonly patches: ReadonlyMap<number, DmxPatch>;
  /** Fixtures without a patch that got an address. */
  readonly autoPatched: number;
  /** Auto-patched fixtures whose channel count is an estimate, because their GDTF mode is not known. */
  readonly estimated: number;
  /** Fixtures without a patch that found no room up to universe 63999 (`MAX_UNIVERSE`); they have no address. */
  readonly unplaced: number;
  /** Fixtures whose stored patch is out of range; they are written without an address. */
  readonly skipped: number;
  readonly warnings: readonly MvrWarning[];
}

/** The fixture's stored patch when it is valid, read with the show-file reader so both accept the same ranges. */
const validPatch = (fixture: StageFixture): DmxPatch | undefined =>
  fixture.patch && parsePatch(new Reader(), fixture.patch, 'patch');

/** What `assign` counts while it fills `patches`. */
interface Assigned {
  readonly autoPatched: number;
  readonly estimated: number;
}

/**
 * Gives each `open` fixture, in fixture-id order, the next address from universe `first` on; a fixture that does
 * not fit in the rest of a universe starts the next one. Past universe 63999 no address can be written, so the rest
 * stay unpatched: filling free ranges of lower universes instead could land between kept patches whose real footprints
 * are not known, and an unpatched fixture is safer than a guessed overlap.
 */
function assign(
  open: readonly StageFixture[],
  first: number,
  mvr: MvrDesignInfo | undefined,
  patches: Map<number, DmxPatch>,
): Assigned {
  let universe = first;
  let address = 1;
  let autoPatched = 0;
  let estimated = 0;
  for (const fixture of open) {
    const { channels, known } = footprintOf(fixture, mvr);
    if (address + channels - 1 > UNIVERSE_CHANNELS) [universe, address] = [universe + 1, 1];
    if (universe > MAX_UNIVERSE) break;
    patches.set(fixture.id, { universe, address, mode: gdtfIdentity(fixture, mvr).mode });
    address += channels;
    autoPatched += 1;
    if (!known) estimated += 1;
  }
  return { autoPatched, estimated };
}

/**
 * Keeps every fixture's valid patch and gives each unpatched fixture an address, so a console can drive the exported
 * rig at once. Assigned fixtures go into fresh universes after the highest one already used, so they never overlap a
 * kept patch. The footprint is the real channel count of the fixture's GDTF mode where known (`footprintOf`).
 * Kept patches that overlap give `patch-overlap` warnings; an out-of-range patch is skipped, not thrown on.
 */
export function planPatches(fixtures: readonly StageFixture[], mvr: MvrDesignInfo | undefined): PatchPlan {
  const patches = new Map<number, DmxPatch>();
  const spans = fixtures.flatMap((fixture) => {
    const patch = validPatch(fixture);
    if (patch) patches.set(fixture.id, patch);
    return patch ? [{ id: fixture.id, patch, ...footprintOf(fixture, mvr) }] : [];
  });
  const start = Math.max(0, ...spans.map((span) => span.patch.universe)) + 1;
  const open = fixtures.filter((fixture) => !fixture.patch).sort((a, b) => a.id - b.id);
  const { autoPatched, estimated } = assign(open, start, mvr, patches);
  const skipped = fixtures.filter((fixture) => fixture.patch && !patches.has(fixture.id)).length;
  const unplaced = open.length - autoPatched;
  return { patches, autoPatched, estimated, unplaced, skipped, warnings: patchOverlaps(spans) };
}
