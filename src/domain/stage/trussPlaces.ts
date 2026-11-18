import { Quaternion, Vector3 } from 'three';
import type { StageFixture } from './StageDesign';
import { besideColumn } from './towerPlaces';
import type { StageTruss } from './trussTypes';
import type { Quat, Transform, Vec3 } from './types';

/** A batch that lands on fixtures already there moves one lane (metres) upstage, or one lane out on a circle. */
const LANE_SHIFT_M = 0.4;
const IDENTITY: Quat = [0, 0, 0, 1];

/**
 * How far (metres) a hung fixture sits below the centre line of a straight, goalpost, roof or circle truss, in the
 * truss frame. Builder adds and the template rows share it, so a builder batch on a template truss lands on the
 * template fixtures and shifts a lane. A tower gets no drop: its fixtures stand beside it (`besideColumn`).
 */
export const HANG_DROP_M = 0.45;

/** Where a new fixture goes: world position and, when the truss turns the body, its rotation (plan §3.1 G2). */
export type FixturePlace = Pick<StageFixture, 'position' | 'rotation'>;

/** A spot in the truss frame and the turn the body gets on top of the truss rotation. */
type LocalPlace = { readonly at: Vec3; readonly turn?: Quat };

/**
 * `count` evenly spread places on a truss, in lane `lane` (0 = on the truss line): a straight from `a` to `b`, a
 * goalpost along its top beam, a roof across its width, a circle at angle steps of 2π/count, with a yaw that turns
 * each body to the centre; all of them `HANG_DROP_M` below the truss. A tower spreads from `a` to `b` beside the
 * column (`besideColumn`), with no drop, so no fixture goes below its base; `besideColumn` also moves its lane, which
 * must follow the side step so a later lane never lands back in the column. A rotated truss passes its rotation on,
 * so beams follow the truss.
 */
export function placesOnTruss(truss: StageTruss, count: number, lane: number): FixturePlace[] {
  if (truss.params.kind === 'tower') {
    const onLine = localPlaces(truss, count, 0).map((p) => toWorld(truss.transform, p));
    return besideColumn(onLine, lane * LANE_SHIFT_M);
  }
  return localPlaces(truss, count, lane).map((p) => toWorld(truss.transform, hung(p)));
}

/**
 * `count` places spread evenly from `from` to `to` (world metres), in lane `lane`. Each place sits in the middle of an
 * equal slice, so no fixture lands on an end and one fixture lands in the centre.
 */
export function placesOnLine(from: Vec3, to: Vec3, count: number, lane: number): FixturePlace[] {
  return lineOf(from, to, count, lane).map((p) => ({ position: p.at }));
}

function localPlaces(truss: StageTruss, count: number, lane: number): LocalPlace[] {
  const p = truss.params;
  switch (p.kind) {
    case 'straight':
    case 'tower':
      return lineOf(p.a, p.b, count, lane);
    case 'goalpost':
      return lineOf([-p.width / 2, p.height, 0], [p.width / 2, p.height, 0], count, lane);
    case 'roof':
      return lineOf([-p.size[0] / 2, 0, 0], [p.size[0] / 2, 0, 0], count, lane);
    case 'circle':
      return ringOf(p.radius + lane * LANE_SHIFT_M, count);
  }
}

function lineOf(a: Vec3, b: Vec3, count: number, lane: number): LocalPlace[] {
  return Array.from({ length: count }, (_, i) => {
    const t = (i + 0.5) / count;
    return { at: [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t - lane * LANE_SHIFT_M] };
  });
}

/**
 * Angles count from +z toward +x (x = sin θ, z = cos θ), the convention of the legacy ring (`domain/rig/ring.ts`), so
 * fixture i of a builder ring lands at the same angle as unit i of the legacy ring. At pan 0 a body faces +z, and a
 * yaw ψ turns that front to (sin ψ, cos ψ), so the yaw that faces the centre from angle θ is atan2(-sin θ, -cos θ).
 */
function ringOf(radius: number, count: number): LocalPlace[] {
  return Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * 2 * Math.PI;
    const yaw = Math.atan2(-Math.sin(angle), -Math.cos(angle));
    const turn: Quat = [0, Math.sin(yaw / 2), 0, Math.cos(yaw / 2)];
    return { at: [radius * Math.sin(angle), 0, radius * Math.cos(angle)], turn };
  });
}

function hung(p: LocalPlace): LocalPlace {
  return { ...p, at: [p.at[0], p.at[1] - HANG_DROP_M, p.at[2]] };
}

function toWorld(t: Transform, p: LocalPlace): FixturePlace {
  const base = new Quaternion(...(t.rotation ?? IDENTITY));
  const at = new Vector3(...p.at).applyQuaternion(base).add(new Vector3(...t.position));
  if (!t.rotation && !p.turn) return { position: [at.x, at.y, at.z] };
  const q = base.multiply(new Quaternion(...(p.turn ?? IDENTITY)));
  return { position: [at.x, at.y, at.z], rotation: [q.x, q.y, q.z, q.w] };
}
