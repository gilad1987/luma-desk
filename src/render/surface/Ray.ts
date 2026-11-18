import type { Vector3 } from 'three';

/** A direction part closer to 0 than this is moved to it, so its inverse is finite and no box test makes a NaN. */
const MIN_DIRECTION = 1e-12;

const inverse = (d: number): number => 1 / (Math.abs(d) > MIN_DIRECTION ? d : MIN_DIRECTION);

/**
 * A ray on its way through a hierarchy: origin, direction, the inverse direction for the box tests, and the nearest
 * hit so far. Plain number fields that one owner refills per ray, so a walk allocates nothing.
 */
export class Ray {
  ox = 0;
  oy = 0;
  oz = 0;
  dx = 0;
  dy = 0;
  dz = 0;
  ix = 0;
  iy = 0;
  iz = 0;
  /** Hits nearer than this do not count. */
  near = 0;
  /** The distance of the nearest hit so far; it starts at the far limit of the ray. */
  t = Infinity;
  /** The primitive of the nearest hit, or -1 while there is none. */
  prim = -1;

  /** Starts a ray whose hits count between `near` and `far`. */
  set(origin: Vector3, direction: Vector3, near: number, far: number): void {
    this.ox = origin.x;
    this.oy = origin.y;
    this.oz = origin.z;
    this.dx = direction.x;
    this.dy = direction.y;
    this.dz = direction.z;
    this.#start(near, far);
  }

  /**
   * Starts this ray as `world` moved by the matrix at `m[at]` (three rows of four), with what is left of its reach.
   * The direction is not made a unit vector again, so a distance on this ray is the same number as on `world`.
   */
  setMoved(world: Ray, m: Float64Array, at: number): void {
    const { ox, oy, oz, dx, dy, dz } = world;
    this.ox = (m[at] ?? 0) * ox + (m[at + 1] ?? 0) * oy + (m[at + 2] ?? 0) * oz + (m[at + 3] ?? 0);
    this.oy = (m[at + 4] ?? 0) * ox + (m[at + 5] ?? 0) * oy + (m[at + 6] ?? 0) * oz + (m[at + 7] ?? 0);
    this.oz = (m[at + 8] ?? 0) * ox + (m[at + 9] ?? 0) * oy + (m[at + 10] ?? 0) * oz + (m[at + 11] ?? 0);
    this.dx = (m[at] ?? 0) * dx + (m[at + 1] ?? 0) * dy + (m[at + 2] ?? 0) * dz;
    this.dy = (m[at + 4] ?? 0) * dx + (m[at + 5] ?? 0) * dy + (m[at + 6] ?? 0) * dz;
    this.dz = (m[at + 8] ?? 0) * dx + (m[at + 9] ?? 0) * dy + (m[at + 10] ?? 0) * dz;
    this.#start(world.near, world.t);
  }

  #start(near: number, far: number): void {
    this.ix = inverse(this.dx);
    this.iy = inverse(this.dy);
    this.iz = inverse(this.dz);
    this.near = near;
    this.t = far;
    this.prim = -1;
  }
}
