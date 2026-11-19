import type { MvrDesignInfo } from '../../domain/stage/mvr';
import type { StageFixture } from '../../domain/stage/StageDesign';
import { LUMA_PROVIDER } from '../luma/lumaData';
import { deskType } from './deskType';
import { gdtfIdentity } from './gdtfIdentity';

/**
 * Real DMX footprints (channel count) of the GDTF modes the desk types name, read from the GDTF files in the official
 * MVR sample files, keyed by `spec|mode`. Desk fixtures have no GDTF file to read, so this table is their only real
 * count; any other mode falls back to an estimate. The desk types name nine products; only these three have a GDTF
 * file in the sample folders (measured again on 2026-11-18), so the other six stay estimates until a file for them is
 * read. No count is entered from a mode name or a data sheet.
 */
const FOOTPRINTS: ReadonlyMap<string, number> = new Map([
  ['Robe Lighting@Robin Spiider.gdtf|Mode 1 - Zones', 49],
  ['Robe Lighting@Robin Tetra2.gdtf|Mode 1-Wash', 34],
  ['Robe@Robin MegaPointe@r3038.gdtf|1', 39],
]);

/** How many DMX channels a fixture takes, and whether that number is the real one. */
export interface Footprint {
  readonly channels: number;
  readonly known: boolean;
}

/**
 * The footprint of a fixture as the export writes it. An imported fixture that keeps its GDTF identity takes the
 * footprint the import read from its GDTF mode. Otherwise the table gives the real count of the desk type's mode,
 * else the desk type's attribute count (the size of the desk's own DMX layout) is an estimate, which the export
 * summary and the overlap warnings flag. For the desk's own products (`LUMA DESK@...`) that layout is the product's
 * only mode: no other GDTF exists for them, so the count is real.
 */
export function footprintOf(fixture: StageFixture, mvr: MvrDesignInfo | undefined): Footprint {
  const identity = gdtfIdentity(fixture, mvr);
  const stored = identity.imported ? mvr?.fixtures[String(fixture.id)]?.footprint : undefined;
  const channels = stored ?? FOOTPRINTS.get(`${identity.spec}|${identity.mode}`);
  if (channels !== undefined) return { channels, known: true };
  return { channels: deskType(fixture).attrs.length, known: identity.spec.startsWith(`${LUMA_PROVIDER}@`) };
}
