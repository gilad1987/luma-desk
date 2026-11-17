import type { Quaternion, Vector3 } from 'three';
import type { AttrName, AttrValues } from './attributes';
import type { FixtureType, FixtureTypeId } from './FixtureType';
import { TYPES } from './fixtureTypes';

/** Every mount; the stage parser reads a stored mount against this list, so it cannot drift from `Mount`. */
export const MOUNTS = ['hang', 'floor', 'wall'] as const;

/** How a fixture is rigged; floor units point up at tilt 0, hung and wall units point down. */
export type Mount = (typeof MOUNTS)[number];

/**
 * A pan/tilt pair in degrees: what `aimAt` returns and what a static fixture is rigged at. It is readonly because a
 * rigged aim is fixed for the life of the rig; code that wants a different aim makes a new pair.
 */
export interface PanTilt {
  readonly pan: number;
  readonly tilt: number;
}

/** Where a fixture's LED pixel strip sits on its truss: centre, direction along the truss, and length. */
export interface PixelStrip {
  readonly p: Vector3;
  readonly tan: Vector3;
  readonly len: number;
}

/**
 * One fixture of the rig: its identity, type and place in the venue, plus the engine's output for the current frame.
 * Render and UI state (`vis`, `vo`, `sel`, `dom`) is not part of it; until Phases 4-5 the legacy script still adds
 * those fields to the object at run time, so instances stay plain extensible objects.
 */
export class Fixture {
  readonly id: number;
  readonly type: FixtureTypeId;
  /** The type record, kept on the fixture because the engine and renderer read it once per fixture per frame. */
  readonly T: FixtureType;
  readonly pos: Vector3;
  readonly mount: Mount;
  /**
   * The rigged pan/tilt of a static fixture, or null for a moving one and for the LED screen, which has no beam to
   * aim. The profiles get theirs from `aimAt` while the rig is built.
   */
  readonly fixed: PanTilt | null;
  /** This frame's output values. Empty until the first output merge, which then writes every attribute each frame. */
  readonly out: AttrValues = {};
  /** The output before phasers; the UI shows it as the value a fixture would hold without effects. */
  readonly base: AttrValues = {};
  /**
   * Set only on fixtures that carry a pixel strip (ring, tower and angled-truss units). `declare` keeps the other
   * fixtures without a `pix` key at all, as the original plain objects were.
   */
  declare pix?: PixelStrip;
  /**
   * The body orientation relative to the rest pose (hanging, beam straight down), set only on fixtures whose design
   * gives one (G1): circle trusses, rotated trusses and MVR imports. It is always unit (`rigFromDesign` normalizes it),
   * because `aimAt` inverts it by its conjugate. When it is set, `aimAt` and `dirFrom` use it and
   * ignore `mount` (G2). `declare` keeps the built-in rig without a `rotation` key, so its output stays at parity.
   */
  declare rotation?: Quaternion;

  constructor(id: number, type: FixtureTypeId, pos: Vector3, mount: Mount, fixed: PanTilt | null) {
    this.id = id;
    this.type = type;
    this.T = TYPES[type];
    this.pos = pos;
    this.mount = mount;
    this.fixed = fixed;
  }

  /** Whether this fixture's type has the attribute, so commands and presets skip fixtures that cannot use it. */
  has(attr: AttrName): boolean {
    return this.T.attrs.includes(attr);
  }
}
