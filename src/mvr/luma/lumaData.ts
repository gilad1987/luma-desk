import type { StageDesign, StageFixture } from '../../domain/stage/StageDesign';
import type { Vec3 } from '../../domain/stage/types';

/** The `provider` of the desk's own `<Data>` block, and of the whole file. */
export const LUMA_PROVIDER = 'LUMA DESK';

/** The format version of the `<Data>` JSON; a reader ignores any other, so a later format is never misread. */
export const LUMA_DATA_VERSION = '1';

/**
 * The start of every mesh file name a luma export writes. The import knows the desk rebuilds those objects from the
 * luma data, so it drops their placements: no double stage, no doubled surfaces and no missing-mesh warnings.
 */
export const LUMA_MESH_PREFIX = 'luma_';

/**
 * The imported GDTF mode's channel count (`MvrFixtureInfo.footprint`) and, when the GDTF gave one, the size the body
 * is drawn at (`MvrFixtureInfo.bodySize`), with the `<GDTFSpec>` and `<GDTFMode>` they were measured for. Another
 * tool may change a fixture's spec or mode and keep the desk's `<UserData>`, so the import trusts `channels` and
 * `bodySize` only while the `<Fixture>` still names this spec and mode. `channels` is absent for a mode with no DMX
 * footprint (no channel, or only virtual ones): its body size must still travel, or the re-import moves the body.
 */
export interface LinkFootprint {
  readonly channels?: number;
  readonly bodySize?: number;
  readonly gdtfSpec: string;
  readonly gdtfMode: string;
}

/**
 * The desk fields of one fixture that a `<Fixture>` element cannot hold or holds only lossily: the role, the truss it
 * hangs on, the desk type and mount (MVR has only a GDTF name and a matrix), and the `fixed` and `pixel` aims that
 * the rig derives special fixtures from. Without them a round trip would turn those fixtures into plain moving heads.
 * `footprint` exists because the export holds no GDTF file, so without it a second export would measure the patch
 * with the desk type's estimate, and the body would lose its GDTF size and move by the change in mount shift. It is
 * MVR data, not a fixture field, so the import puts it back into the MVR facts, never onto the fixture.
 */
export type FixtureLink = Pick<StageFixture, 'id' | 'type' | 'role' | 'trussId' | 'mount' | 'fixed' | 'pixel'> & {
  readonly footprint?: LinkFootprint;
  /**
   * The fixture has a `rotation`: its `<Matrix>` is its real body orientation. Without the flag a matrix in the rest
   * pose of the mount is the desk's own pose and gives no `rotation` (a desk floor unit, and every older export).
   */
  readonly ownRotation?: true;
  /**
   * The `<Fixture uuid>` and its `occurrence` (absent for 0) of a fixture with MVR facts. The import pairs the link
   * with the fixture by them, because the desk id can change on the way: a pass-through keeps the file's own empty
   * `FixtureID`, so the next import numbers again. A link without one (a desk fixture, an older export) pairs by id.
   */
  readonly uuid?: string;
  readonly occurrence?: number;
};

/**
 * The stage parts plain MVR cannot hold: venue, scenery on/off, the deck numbers, LED walls, risers, truss params
 * and each fixture's link. Fixtures themselves travel as `<Fixture>` elements, which every MVR reader understands.
 * `offset` is the world offset the export took off every point (the fit of an imported design), so the import adds
 * it back and the stage lands where it was. `hiddenLayers` is the user's layer choice of an imported design, which
 * the import puts back over the hall rule's guess; an export without MVR facts, or an older one, has none.
 */
export type LumaStageData = Pick<StageDesign, 'venue' | 'scenery' | 'deck' | 'screens' | 'risers' | 'trusses'> & {
  readonly offset: Vec3;
  readonly links: readonly FixtureLink[];
  readonly hiddenLayers?: readonly string[];
  /** Only in an export made from another program's file: who wrote that file, as the root now names the desk. */
  readonly originalProvider?: OriginalProvider;
};

/** The root `provider` and `providerVersion` of the file the desk exported from. */
export interface OriginalProvider {
  readonly provider: string;
  readonly providerVersion: string;
}

/** The link of a fixture; optional fields stay absent when the fixture has none, so the JSON never holds `null`s. */
export function linkOf(fixture: StageFixture): FixtureLink {
  const { id, type, role, trussId, mount, fixed, pixel, rotation } = fixture;
  const own = rotation ? { ownRotation: true as const } : {};
  return { id, type, role, trussId, mount, ...(fixed ? { fixed } : {}), ...(pixel ? { pixel } : {}), ...own };
}
