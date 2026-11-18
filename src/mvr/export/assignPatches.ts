import type { DmxPatch } from '../../domain/stage/DmxPatch';
import type { MvrDesignInfo } from '../../domain/stage/mvr';
import { MAX_UNIVERSE, UNIVERSE_CHANNELS } from '../../domain/stage/parse/parsePatch';
import type { StageFixture } from '../../domain/stage/StageDesign';
import { gdtfIdentity } from './gdtfIdentity';
import { footprintOf } from './modeFootprints';

/** What `assignPatches` did while it filled `patches`. */
export interface Assigned {
  readonly autoPatched: number;
  /** Ids of the fixtures that got an address measured with an estimated channel count. */
  readonly estimated: readonly number[];
  /** Fixtures left without an address because their channel count is only an estimate. */
  readonly unsized: number;
}

/**
 * Gives each `open` fixture, in fixture-id order, the next address from universe `first` on; a fixture that does
 * not fit in the rest of a universe starts the next one. Past universe 63999 no address can be written, so the rest
 * stay unpatched: filling free ranges of lower universes instead could land between kept patches whose real footprints
 * are not known, and an unpatched fixture is safer than a guessed overlap. With `placeEstimates` off, a fixture whose
 * channel count is only an estimate gets no address at all: in a file that holds a real rig, a guessed address beside
 * real ones reads as real.
 */
export function assignPatches(
  open: readonly StageFixture[],
  mvr: MvrDesignInfo | undefined,
  patches: Map<number, DmxPatch>,
  { first, placeEstimates }: { readonly first: number; readonly placeEstimates: boolean },
): Assigned {
  let universe = first;
  let address = 1;
  let autoPatched = 0;
  let unsized = 0;
  const estimated: number[] = [];
  for (const fixture of open) {
    const { channels, known } = footprintOf(fixture, mvr);
    if (!known && !placeEstimates) {
      unsized += 1;
      continue;
    }
    if (address + channels - 1 > UNIVERSE_CHANNELS) [universe, address] = [universe + 1, 1];
    if (universe > MAX_UNIVERSE) break;
    patches.set(fixture.id, { universe, address, mode: gdtfIdentity(fixture, mvr).mode });
    address += channels;
    autoPatched += 1;
    if (!known) estimated.push(fixture.id);
  }
  return { autoPatched, estimated, unsized };
}
