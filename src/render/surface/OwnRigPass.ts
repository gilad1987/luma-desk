import { Vector3 } from 'three';
import type { MeshInstances } from './MeshInstances';
import { Ray } from './Ray';
import { RIG_KIND } from './rigKind';

/** A hit this near the lens (metres) can be the fixture's own rig, however short its throw is. */
const MIN_THROW = 2;
/** The same for a long throw: this share of the free throw to the next hit behind it. */
const THROW_SHARE = 0.1;
/** No hit farther than this is tested: a 50 m throw has the widest near zone. */
const MAX_THROW = 5;
/**
 * The disc of test rays around the axis: a wash lens, and the spread of a medium beam (8.5 degrees to the side).
 * `hit` has no zoom, so one footprint stands for every fixture; at 1.4 m it is 0.8 m across, wider than a truss.
 */
const LENS = 0.2;
const SPREAD = 0.15;
const PROBES = 16;
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));
/** Metres past a passed hit where the next one counts: more than the wall of a tube, less than a truss is deep. */
const STEP = 0.05;
/** A lattice has a few chords and braces in a row; more passes than this is no truss. */
const MAX_PASSES = 8;

/**
 * Lets a beam leave the rig it hangs in. The axis of a fixture often meets a truss chord, a clamp or a pipe within
 * a metre or two of the lens; the light goes around such thin scenery, so the beam must not end there. Only a hit
 * in the near zone can be passed, and the zone grows only with a real throw behind the hit: with open space behind
 * it the zone is `MIN_THROW`, so a performer 4 m in front of a side light stops its beam. In the zone the class of
 * the mesh decides where the file gives one (`rigKind`): rig structure is passed, a figure, deck, wall or drape
 * never. With no class, a hit is passed when most of a disc of rays, as wide as the beam is there, goes past it.
 */
export class OwnRigPass {
  readonly #instances: MeshInstances;
  readonly #axis = new Ray();
  readonly #probe = new Ray();
  readonly #from = new Vector3();

  constructor(instances: MeshInstances) {
    this.#instances = instances;
  }

  /**
   * Traces `ray` from `near` to `far` and leaves in it the first hit that is not the thin scenery of the beam's own
   * rig. A ray with no hit in the near zone costs this one trace: every beam of a moving light asks each frame.
   */
  trace(ray: Ray, origin: Vector3, direction: Vector3, far: number): void {
    const instances = this.#instances;
    const near = ray.near;
    instances.trace(ray);
    if (ray.prim < 0 || ray.t >= MAX_THROW) return;
    const axis = this.#axis;
    let from = near;
    let first = ray.t;
    let kind = instances.kind[ray.prim];
    for (let pass = 0; pass < MAX_PASSES && kind !== RIG_KIND.solid; pass++) {
      axis.set(origin, direction, first + STEP, far);
      instances.trace(axis);
      // with no mesh behind, `axis.t` is still `far`: the hit on the stage's other surfaces, or no end at all
      const zone = axis.t === Infinity ? MIN_THROW : Math.max(MIN_THROW, THROW_SHARE * axis.t);
      if (first > zone) break;
      if (kind !== RIG_KIND.rig && this.#stops(origin, direction, from, first)) break;
      from = first + STEP;
      if (axis.prim < 0 || axis.t >= MAX_THROW) break;
      first = axis.t;
      kind = instances.kind[axis.prim];
    }
    // the traces above moved the hit triangle that the instances hold for the normal
    ray.set(origin, direction, from, far);
    instances.trace(ray);
  }

  /** True when the scenery at `at` stops at least half of the disc of rays around the axis. */
  #stops(origin: Vector3, direction: Vector3, near: number, at: number): boolean {
    const { x, y, z } = direction;
    const radius = LENS + SPREAD * at;
    // two unit vectors across the beam: u from the axis that the beam is not along, v across both
    const upright = Math.abs(y) > 0.9;
    const scale = 1 / Math.hypot(upright ? y : x, z);
    const ux = upright ? 0 : -z * scale;
    const uy = upright ? z * scale : 0;
    const uz = upright ? -y * scale : x * scale;
    const vx = y * uz - z * uy;
    const vy = z * ux - x * uz;
    const vz = x * uy - y * ux;
    let stopped = 0;
    for (let i = 0; i < PROBES; i++) {
      // a sunflower over the disc: even by area, and on no line or ring that a row of chords could match
      const ring = radius * Math.sqrt((i + 0.5) / PROBES);
      const c = Math.cos(i * GOLDEN_ANGLE) * ring;
      const s = Math.sin(i * GOLDEN_ANGLE) * ring;
      this.#from.set(origin.x + c * ux + s * vx, origin.y + c * uy + s * vy, origin.z + c * uz + s * vz);
      // a slanted wall meets the ring up to one radius deeper than the axis
      this.#probe.set(this.#from, direction, near, at + radius + STEP);
      this.#instances.trace(this.#probe);
      if (this.#probe.prim >= 0) stopped += 1;
    }
    return stopped * 2 >= PROBES;
  }
}
