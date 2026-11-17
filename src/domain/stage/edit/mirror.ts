import { Quaternion, Vector3 } from 'three';
import type { StageDesign, StageFixture } from '../StageDesign';
import type { StageTruss } from '../trussTypes';
import type { Vec3 } from '../types';
import { isSameSpot } from './addFixtures';
import { appendCopies } from './copies';
import { newTrussId } from './ids';
import { mirrorFixture, mirrorPoint, mirrorTruss } from './mirrorGeometry';

/** Items within 1 cm of x = 0 sit on the centre line; mirror leaves them alone. */
const CENTRE_LINE_M = 0.01;

/**
 * Copies the left side, as seen from the audience (house left, x < 0, the side the query `side: 'left'` selects),
 * onto the right. A truss counts as left by its world geometry, so a template truss drawn with world end points at an
 * origin transform counts too. A left truss gets a mirror truss unless one already stands on its mirror spot, and each
 * mirrored fixture links to that mirror truss, so moving the left truss leaves the right side alone. A left fixture
 * gets a copy unless a fixture already stands on its spot, so mirroring twice adds nothing and right-side items the
 * user placed are kept. With nothing to copy it returns `d` itself, so History adds no undo step.
 */
export function mirrorLeftToRight(d: StageDesign): StageDesign {
  let next = d;
  const trussIds = new Map<string, string>();
  for (const t of d.trusses.filter((truss) => isLeft(worldPoints(truss)))) {
    const spots = worldPoints(t).map(mirrorPoint);
    const twin = d.trusses.find((o) => o.params.kind === t.params.kind && isSameSpots(worldPoints(o), spots));
    const id = twin?.id ?? newTrussId(next, t.params.kind);
    trussIds.set(t.id, id);
    if (!twin) next = { ...next, trusses: [...next.trusses, mirrorTruss(t, id)] };
  }
  const left = d.fixtures.filter((f) => f.position[0] < -CENTRE_LINE_M);
  const sources = left.filter((f) => !d.fixtures.some((o) => isSameSpot(o.position, mirrorPoint(f.position))));
  if (next === d && !sources.length) return d;
  const trussOf = (f: StageFixture): string | null => (f.trussId ? (trussIds.get(f.trussId) ?? f.trussId) : null);
  return appendCopies(next, sources.map(mirrorFixture), trussOf);
}

/** The world points that place a truss: the ends of a straight or tower, the transform position of the others. */
function worldPoints(t: StageTruss): Vec3[] {
  const p = t.params;
  if (p.kind !== 'straight' && p.kind !== 'tower') return [t.transform.position];
  const turn = new Quaternion(...(t.transform.rotation ?? [0, 0, 0, 1]));
  const at = new Vector3(...t.transform.position);
  return [p.a, p.b].map((v) => new Vector3(...v).applyQuaternion(turn).add(at).toArray());
}

/** Left when no point is right of the centre line and at least one is clearly left of it. */
function isLeft(points: readonly Vec3[]): boolean {
  return points.every((p) => p[0] < CENTRE_LINE_M) && points.some((p) => p[0] < -CENTRE_LINE_M);
}

function isSameSpots(points: readonly Vec3[], spots: readonly Vec3[]): boolean {
  return points.length === spots.length && points.every((p, i) => isSameSpot(p, spots[i] ?? [NaN, NaN, NaN]));
}
