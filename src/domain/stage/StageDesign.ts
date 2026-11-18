import type { Mount, PanTilt } from '../Fixture';
import type { FixtureTypeId } from '../FixtureType';
import type { StageTruss } from './trussTypes';
import type { FixtureRole, Quat, SceneryPart, StageSource, VenueKind, Vec3 } from './types';

/** The design format version. A parser rejects other versions, so a future format change cannot be misread. */
export const STAGE_DESIGN_VERSION = 1;

/** Above this many fixtures the builder warns; frame time grows with the fixture count. */
export const FIXTURE_SOFT_LIMIT = 500;

/** The stage deck: an x/z rectangle in world metres and its top height. */
export interface StageDeck {
  readonly x0: number;
  readonly x1: number;
  readonly z0: number;
  readonly z1: number;
  readonly height: number;
}

/** A side screen next to the LED wall; `at` is its centre and `yaw` its turn about Y in radians. */
export interface SideScreen {
  readonly at: Vec3;
  readonly yaw: number;
  readonly width: number;
  readonly height: number;
}

/**
 * An LED wall. `fixtureId` points at a fixture of type 'screen', which drives the wall picture, so the wall is lit
 * through the normal fixture output.
 */
export interface StageScreen {
  readonly id: string;
  readonly fixtureId: number;
  readonly x0: number;
  readonly x1: number;
  readonly y0: number;
  readonly y1: number;
  readonly z: number;
  readonly sides?: readonly SideScreen[];
}

/** A riser on the deck; `at` is the centre of its top face, so fixtures and beams can land on it. */
export interface StageRiser {
  readonly id: string;
  readonly at: Vec3;
  readonly size: Vec3;
}

/**
 * One fixture of the design. `position` is absolute (metres, world frame, Y-up, audience at +z), so the rig keeps
 * exact floats; `trussId` is only the parent link. `rotation` is a unit quaternion `[x, y, z, w]`, world frame: the
 * body orientation relative to the rest pose (hanging, beam straight down). Without `rotation`, `mount` works
 * exactly as today, which keeps the default rig at parity (G1).
 */
export interface StageFixture {
  readonly id: number;
  readonly type: FixtureTypeId;
  readonly role: FixtureRole;
  readonly trussId: string | null;
  readonly position: Vec3;
  readonly mount: Mount;
  readonly rotation?: Quat;
  readonly fixed?: PanTilt;
  readonly pixel?: { readonly p: Vec3; readonly tan: Vec3; readonly len: number };
}

/**
 * The whole stage as readonly plain data: the one model that templates, the builder and the MVR import all produce
 * and that the rig is derived from. Edits return a new design, so undo can keep old ones.
 */
export interface StageDesign {
  readonly v: typeof STAGE_DESIGN_VERSION;
  readonly source: StageSource;
  /** `gridY` is the top of the drop chains. */
  readonly venue: { readonly kind: VenueKind; readonly gridY?: number };
  /** Required for every part (G3), so a design never leaves the visibility of a scenery part unknown. */
  readonly scenery: Readonly<Record<SceneryPart, boolean>>;
  readonly deck: StageDeck;
  readonly screens: readonly StageScreen[];
  readonly risers: readonly StageRiser[];
  /** Array order is render order. */
  readonly trusses: readonly StageTruss[];
  /** Array order is rig build order. */
  readonly fixtures: readonly StageFixture[];
  // G4 slot: MVR adds `readonly mvr?: MvrDesignInfo` from src/domain/stage/mvr.ts. Stage Builder does NOT define it.
  // Every edit copies a design with `{ ...d, field }`, so the field survives edits.
}
