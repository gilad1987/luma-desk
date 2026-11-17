import { Quaternion, Vector3 } from 'three';
import type { StageFixture } from './StageDesign';
import type { StageTruss } from './trussTypes';
import type { Quat, Transform, Vec3 } from './types';

/** A batch that lands on fixtures already there moves one lane (metres) upstage, or one lane out on a circle. */
const LANE_SHIFT_M = 0.4;
/** How far (metres) a tower fixture stands beside the column, toward the stage centre, so it does not sit inside it. */
const TOWER_STEP_M = 0.4;
const IDENTITY: Quat = [0, 0, 0, 1];

/**
 * How far (metres) a hung fixture sits below the centre line of a straight, goalpost, roof or circle truss, in the
 * truss frame. Builder adds and the template rows share it, so a builder batch on a template truss lands on the
 * template fixtures and shifts a lane. A tower gets no drop: its fixtures stand beside it (`TOWER_STEP_M`).
 */
export const HANG_DROP_M = 0.45;

/** Where a new fixture goes: world position and, when the truss turns the body, its rotation (plan §3.1 G2). */
export type FixturePlace = Pick<StageFixture, 'position' | 'rotation'>;

/** A spot in the truss frame and the turn the body gets on top of the truss rotation. */
type LocalPlace = { readonly at: Vec3; readonly turn?: Quat };

/**
 * `count` evenly spread places on a truss, in lane `lane` (0 = on the truss line): a straight from `a` to `b`, a
 * goalpost along its top beam, a roof across its width, a circle at angle steps of 2π/count, offset by `phase` steps,
 * with a yaw that turns each body to the centre; all of them `HANG_DROP_M` below the truss. A tower spreads from `a`
 * to `b` with no drop, so no fixture goes below its base, and each place steps `TOWER_STEP_M` toward x = 0, beside
 * the column. A rotated truss passes its rotation on, so beams follow the truss.
 */
export function placesOnTruss(truss: StageTruss, count: number, lane: number, phase = 0): FixturePlace[] {
  const local = localPlaces(truss, count, lane, phase);
  if (truss.params.kind === 'tower') return local.map((p) => besideColumn(toWorld(truss.transform, p)));
  return local.map((p) => toWorld(truss.transform, hung(p)));
}

/**
 * `count` places spread evenly from `from` to `to` (world metres), in lane `lane`. Each place sits in the middle of an
 * equal slice, so no fixture lands on an end and one fixture lands in the centre.
 */
export function placesOnLine(from: Vec3, to: Vec3, count: number, lane: number): FixturePlace[] {
  return lineOf(from, to, count, lane).map((p) => ({ position: p.at }));
}

function localPlaces(truss: StageTruss, count: number, lane: number, phase: number): LocalPlace[] {
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
      return ringOf(p.radius + lane * LANE_SHIFT_M, count, phase);
  }
}

function lineOf(a: Vec3, b: Vec3, count: number, lane: number): LocalPlace[] {
  return Array.from({ length: count }, (_, i) => {
    const t = (i + 0.5) / count;
    return { at: [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t - lane * LANE_SHIFT_M] };
  });
}

/**
 * Angles count from +z toward +x (x = sin θ, z = cos θ), the legacy ring convention. At pan 0 a body faces +z,
 * and a yaw ψ turns that front to (sin ψ, cos ψ), so the yaw that faces the centre from angle θ is
 * atan2(-sin θ, -cos θ).
 */
function ringOf(radius: number, count: number, phase: number): LocalPlace[] {
  return Array.from({ length: count }, (_, i) => {
    const angle = ((i + phase) / count) * 2 * Math.PI;
    const yaw = Math.atan2(-Math.sin(angle), -Math.cos(angle));
    const turn: Quat = [0, Math.sin(yaw / 2), 0, Math.cos(yaw / 2)];
    return { at: [radius * Math.sin(angle), 0, radius * Math.cos(angle)], turn };
  });
}

function hung(p: LocalPlace): LocalPlace {
  return { ...p, at: [p.at[0], p.at[1] - HANG_DROP_M, p.at[2]] };
}

/** A tower place moved in world x toward the stage centre; a place on the centre line stays where it is. */
function besideColumn(p: FixturePlace): FixturePlace {
  const [x, y, z] = p.position;
  return { ...p, position: [x - Math.sign(x) * TOWER_STEP_M, y, z] };
}

function toWorld(t: Transform, p: LocalPlace): FixturePlace {
  const base = new Quaternion(...(t.rotation ?? IDENTITY));
  const at = new Vector3(...p.at).applyQuaternion(base).add(new Vector3(...t.position));
  if (!t.rotation && !p.turn) return { position: [at.x, at.y, at.z] };
  const q = base.multiply(new Quaternion(...(p.turn ?? IDENTITY)));
  return { position: [at.x, at.y, at.z], rotation: [q.x, q.y, q.z, q.w] };
}
