import type { Vector3 } from 'three';
import type { AttrName, AttrValues } from './attributes';
import type { FixtureType, FixtureTypeId } from './FixtureType';
import { TYPES } from './fixtureTypes';

/** How a fixture is rigged; floor units point up at tilt 0, hung and wall units point down. */
export type Mount = 'hang' | 'floor' | 'wall';

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
 * Render and UI state (`vis`, `vo`, `sel`, `dom`) is not part of it.
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

  constructor({ id, type, pos, mount, fixed }: Pick<Fixture, 'id' | 'type' | 'pos' | 'mount' | 'fixed'>) {
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
