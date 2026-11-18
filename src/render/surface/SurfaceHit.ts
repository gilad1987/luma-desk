import { Vector3 } from 'three';
import type { SurfaceBox } from '../../domain/stage/types';
import { UP } from '../../domain/venue';
import { nearestBoxT } from './boxHit';
import { PARALLEL_EPSILON, hitPoolFloor, hitTerraces } from './surfacePlanes';

/** Where a beam ray meets a surface: the ray distance `t` and the surface normal, compared by identity. */
export interface BeamHit {
  readonly t: number;
  readonly normal: Readonly<Vector3>;
}

/**
 * The LED screen plane faces the audience; the fixture sync tells a screen hit by this exact object.
 *
 * Shared identity object: never mutate it. Hits are sorted by `normal === SCREEN_NORMAL`, and a copy or a changed
 * value would silently move screen hits into the wrong light bucket.
 */
export const SCREEN_NORMAL: Readonly<Vector3> = new Vector3(0, 0, 1);

/**
 * Where fixture beams land (G6): the stage's surface boxes from `setSurfaces`, plus the venue's audience terraces and
 * pool floor, which are not stage data. A `top` box hit carries the `UP` normal and a `front` box hit `SCREEN_NORMAL`,
 * both by identity, because the fixture sync sorts hits into stage, audience and key-light contributions by
 * `normal ===`. Each instance holds its own boxes, so a stage rebuild replaces them with ONE `setSurfaces` call.
 *
 * Quirk kept (02 §4.8, index.html:1700–1706): a top box hit replaces a terrace hit even when the terrace is nearer;
 * the pool floor counts only when neither was hit.
 */
export class SurfaceHit {
  private tops: readonly SurfaceBox[] = [];
  private fronts: readonly SurfaceBox[] = [];

  /** Replaces the boxes beams land on (never adds to them); a new stage design passes `surfacesOf(design)`. */
  setSurfaces(boxes: readonly SurfaceBox[]): void {
    this.tops = boxes.filter((box) => box.face === 'top');
    this.fronts = boxes.filter((box) => box.face === 'front');
  }

  /** Where a beam ray from `origin` along the unit `direction` lands first, or null when it lands nowhere. */
  hit(origin: Vector3, direction: Vector3): BeamHit | null {
    const tier = hitTerraces(origin, direction);
    const best = this.hitGround(origin, direction, tier !== null) ?? tier;
    const front = nearestBoxT(this.fronts, origin, direction);
    return front !== null && front < (best ? best.t : Infinity) ? { t: front, normal: SCREEN_NORMAL } : best;
  }

  /** The ground hit of a downward ray: the nearest top box, else the pool floor when no terrace was hit either. */
  private hitGround(origin: Vector3, direction: Vector3, hasTierHit: boolean): BeamHit | null {
    if (!(direction.y < -PARALLEL_EPSILON)) return null;
    const top = nearestBoxT(this.tops, origin, direction);
    if (top !== null) return { t: top, normal: UP };
    return hasTierHit ? null : hitPoolFloor(origin, direction);
  }
}
