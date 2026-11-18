import { Vector3, type Object3D } from 'three';
import { UP } from '../../domain/venue';
import { Ray } from './Ray';
import { collectScenery, type Scenery } from './collectScenery';
import { HitCache } from './HitCache';
import type { BeamHit } from './SurfaceHit';

/**
 * Mesh hits nearer than this (metres) do not count. A fixture hangs on or stands in scenery: its clamp, truss chord
 * or floor plate lies within this reach of the lens, and a beam must leave its own mount to light the stage.
 */
const NEAR = 0.5;

/** A normal this close to straight up is the shared `UP`: the fixture sync finds floors by `normal === UP`. */
const FLAT = 0.999;

/**
 * Where beam rays meet the real meshes of an imported stage, in any direction. It reads the meshes under `root`
 * once (see `collectScenery`), so a new stage needs a new instance and a dropped instance frees everything. A layer
 * that is hidden, or cleared from the root, lets rays pass; the flags are read on every ray, so the hit set follows
 * a layer toggle with no call. The hit of each ray is cached with the other surfaces' hit folded in, so the caller
 * computes those only on a miss. The returned hit is one object, refilled per ray: use it before the next ray.
 */
export class SceneryHit {
  readonly triangleCount: number;
  readonly #root: Object3D;
  readonly #scenery: Scenery;
  readonly #cache = new HitCache();
  readonly #ray = new Ray();
  readonly #normal = new Vector3();
  readonly #out: { t: number; normal: Readonly<Vector3> } = { t: 0, normal: UP };
  /** Raised whenever a cached hit may be wrong: a layer toggle, or `invalidate`. */
  #epoch = 1;

  constructor(root: Object3D) {
    this.#root = root;
    this.#scenery = collectScenery(root);
    this.triangleCount = this.#scenery.triangleCount;
  }

  /** Forgets every cached hit: the other surfaces that the hits were compared with have changed. */
  invalidate(): void {
    this.#epoch += 1;
  }

  /** The cached hit of this ray (null: it lands nowhere), or undefined when the ray is new: then call `resolve`. */
  recall(origin: Vector3, direction: Vector3): BeamHit | null | undefined {
    const { layers, instances } = this.#scenery;
    for (let i = 0; i < layers.length; i++) {
      const layer = layers[i];
      const shown = layer?.visible && layer.parent === this.#root ? 1 : 0;
      if (instances.shown[i] === shown) continue;
      instances.shown[i] = shown;
      this.#epoch += 1;
    }
    const slot = this.#cache.find(origin, direction, this.#epoch);
    return slot < 0 ? undefined : this.#read(slot);
  }

  /**
   * The nearer of the mesh hit and `other`, the hit on the stage's other surfaces; call it after `recall` gave
   * undefined for the same ray. The mesh normal faces the ray's origin, so a pool lies on the lit side of a sheet.
   */
  resolve(origin: Vector3, direction: Vector3, other: BeamHit | null): BeamHit | null {
    const ray = this.#ray;
    const normal = this.#normal;
    const { instances } = this.#scenery;
    ray.set(origin, direction, NEAR, other ? other.t : Infinity);
    instances.trace(ray);
    const slot = this.#cache.claim(origin, direction, this.#epoch);
    const { values, shared } = this.#cache;
    if (ray.prim >= 0) {
      instances.normalInto(ray.prim, normal);
      if (normal.dot(direction) > 0) normal.negate();
      shared[slot] = normal.y > FLAT ? UP : undefined;
    } else shared[slot] = other?.normal;
    values[slot * 4] = ray.prim >= 0 || other ? ray.t : Infinity;
    values[slot * 4 + 1] = normal.x;
    values[slot * 4 + 2] = normal.y;
    values[slot * 4 + 3] = normal.z;
    return this.#read(slot);
  }

  #read(slot: number): BeamHit | null {
    const { values, shared } = this.#cache;
    const t = values[slot * 4] ?? Infinity;
    if (t === Infinity) return null;
    const at = slot * 4;
    this.#out.t = t;
    this.#out.normal = shared[slot] ?? this.#normal.set(values[at + 1] ?? 0, values[at + 2] ?? 0, values[at + 3] ?? 0);
    return this.#out;
  }
}
