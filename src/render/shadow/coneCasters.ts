import { Vector3 } from 'three';
import { ROW } from '../beams/packBeam';
import { KeyTable } from './KeyTable';
import { beamFrame, FRAME, framePoint, LENS, RANGE, read, TAN } from './beamFrame';
import { NEAR_CLEAR as NEAR } from './tileFrustum';

/** The distance along a unit ray to the nearest scenery triangle between `near` and `far`, or Infinity. */
export type RayProbe = (origin: Vector3, direction: Vector3, near: number, far: number) => number;

/** The rim rays run a little inside the cone edge, where the beam still has light. */
const RIM = 0.9;
/** A ray ends this fraction of the range short of the beam's end: the surface the beam lands on is not a caster. */
const END = 0.98;
/** The axis ray and four rim rays, as (side, up) pairs. */
const RAYS = [0, 0, 1, 0, -1, 0, 0, 1, 0, -1] as const;
const SLOTS = 2048;

/**
 * Tells whether a beam cone holds a caster before its end, with five rays through the scenery BVH. The answer of a
 * row is kept until the row or the scenery epoch changes (bitwise, one row per slot), so a static rig casts no ray.
 */
export class CasterCheck {
  /** Cones traced since `begin`. */
  tests = 0;
  readonly #probe: RayProbe;
  readonly #maxTests: number;
  readonly #table = new KeyTable(SLOTS);
  #frame = 0;
  readonly #epochs = new Uint32Array(SLOTS);
  readonly #results = new Uint8Array(SLOTS);
  readonly #beam = new Float64Array(FRAME);
  readonly #origin = new Vector3();
  readonly #direction = new Vector3();

  /** `maxTests` caps the cones traced per frame; a rig that moves as a whole would trace every light otherwise. */
  constructor(probe: RayProbe, maxTests: number) {
    this.#probe = probe;
    this.#maxTests = maxTests;
  }

  /** Call once per frame, before the first `has`. */
  begin(): void {
    this.tests = 0;
    this.#frame += 1;
  }

  /** False also when this frame's tests are used up: the light waits unshadowed for a later frame. */
  has(rows: ArrayLike<number>, words: Uint32Array, light: number, epoch: number): boolean {
    const known = this.#table.find(words, light * ROW, this.#frame + 1);
    if (known >= 0 && this.#epochs[known] === epoch) return this.#results[known] === 1;
    if (this.tests >= this.#maxTests) return false;
    this.tests += 1;
    beamFrame(rows, light, this.#beam);
    const found = this.#trace();
    const slot = known >= 0 ? known : this.#table.claim(words, light * ROW, this.#frame + 1);
    if (slot >= 0) {
      this.#epochs[slot] = epoch;
      this.#results[slot] = found ? 1 : 0;
    }
    return found;
  }

  #trace(): boolean {
    const frame = this.#beam;
    const lens = read(frame, LENS);
    const slope = RIM * read(frame, TAN);
    for (let k = 0; k < RAYS.length; k += 2) {
      const a = read(RAYS, k) * slope;
      const b = read(RAYS, k + 1) * slope;
      // the point one metre along the axis on this ray, less the apex: the ray's direction before it is a unit
      this.#direction.fromArray(framePoint(frame, 1, a, b));
      this.#direction.sub(this.#origin.fromArray(framePoint(frame, 0, 0, 0)));
      const stretch = this.#direction.length();
      this.#origin.addScaledVector(this.#direction, lens);
      this.#direction.divideScalar(stretch);
      const far = (END * read(frame, RANGE) - lens) * stretch;
      if (far > NEAR && this.#probe(this.#origin, this.#direction, NEAR, far) < far) return true;
    }
    return false;
  }
}
