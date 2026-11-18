/**
 * A point or size in metres, world frame, Y-up, audience at +z (G1). A plain tuple, not a three.js `Vector3`, so a
 * design stays plain JSON that the show file, the parser and the MVR import can share without three.js.
 */
export type Vec3 = readonly [x: number, y: number, z: number];

/**
 * A unit quaternion `[x, y, z, w]` in the world frame (G1). It gives the fixture body orientation relative to the rest
 * pose (hanging, beam straight down), so one value covers circle trusses, rotated trusses and MVR matrices alike.
 */
export type Quat = readonly [x: number, y: number, z: number, w: number];

/**
 * The venues the Stage Builder offers. `mvr` is not one: only an import makes it, as it draws nothing but a ground and
 * the sky around a file that brings its own stage, and a builder stage in it would stand in a void.
 */
export const BUILDER_VENUE_KINDS = ['sultans-pool', 'black-box', 'open-field'] as const;

/** A venue the Stage Builder offers (see `BUILDER_VENUE_KINDS`). */
export type BuilderVenueKind = (typeof BUILDER_VENUE_KINDS)[number];

/** Every venue kind; the parser reads stored kinds against this list, so it cannot drift from `VenueKind`. */
export const VENUE_KINDS = [...BUILDER_VENUE_KINDS, 'mvr'] as const;

/** The venue scenery to draw around the stage; each kind has its own static scene in the renderer. */
export type VenueKind = (typeof VENUE_KINDS)[number];

/** Every scenery part in UI order, so toggles and defaults list all parts without a second hand-written list. */
export const SCENERY_PARTS = ['deck', 'trusses', 'band', 'ledWall', 'crowd'] as const;

/** A scenery group that the user can show or hide; a hidden group skips its per-frame work (G3). */
export type SceneryPart = (typeof SCENERY_PARTS)[number];

/** An axis-aligned box around the whole design; the camera fits its views to it (G7). */
export interface StageBounds {
  readonly min: Vec3;
  readonly max: Vec3;
}

/**
 * A box that beams land on (G6). `face` says which side is hit, so the renderer can place beam spots on deck tops and
 * on screen fronts from stage data instead of fixed venue numbers.
 */
export interface SurfaceBox {
  readonly min: Vec3;
  readonly max: Vec3;
  readonly face: 'top' | 'front';
}

/**
 * Every fixture role. Default groups, Auto Show groups and position presets select fixtures by role, not by fixed id
 * ranges, so they still work on a rig that the builder or an MVR import made.
 */
export const FIXTURE_ROLES = [
  'front',
  'mid',
  'back',
  'ring',
  'angled',
  'side',
  'floor',
  'footlight',
  'blinder',
  'strobe',
  'screen',
  'follow',
  'profile',
  'hazer',
] as const;

/** The job a fixture has in the rig; see `FIXTURE_ROLES`. */
export type FixtureRole = (typeof FIXTURE_ROLES)[number];

/** Every truss kind; the parser reads stored kinds against this list, so it cannot drift from `TrussKind`. */
export const TRUSS_KINDS = ['straight', 'circle', 'goalpost', 'tower', 'roof'] as const;

/** The truss shapes the builder can make; each kind has its own params in `TrussParams`. */
export type TrussKind = (typeof TRUSS_KINDS)[number];

/** Every design origin; the parser reads a stored `source.kind` against this list. */
export const SOURCE_KINDS = ['template', 'builder', 'mvr'] as const;

/**
 * Where a design came from. `fileHash` is the SHA-256 key of the original MVR bytes in IndexedDB, so an imported
 * stage can find its source file again.
 */
export interface StageSource {
  readonly kind: (typeof SOURCE_KINDS)[number];
  readonly name: string;
  readonly fileHash?: string;
}

/**
 * Where a truss sits: `position` in world metres (see `Vec3`) and an optional world `rotation` (see `Quat`). Without
 * `rotation` the truss keeps its local axes, which is what every template truss needs.
 */
export interface Transform {
  readonly position: Vec3;
  readonly rotation?: Quat;
}
