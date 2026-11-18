import { trussPoints } from '../bounds';
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
 * onto the right. A truss counts as left by the world points that enclose it (`trussPoints`), for every kind. Each
 * truss whose mirror image already stands (its twin; a symmetric truss is its own) links the copies to that twin. A
 * left truss without a twin gets a mirror truss, and each copy links to it, so moving the left truss leaves the right
 * side alone. A truss across the centre without a twin is not mirrored, and the copies of its left fixtures get no
 * truss link. A left fixture gets a copy unless a fixture already stands on its spot, so mirroring twice adds nothing
 * and right-side items the user placed are kept. With nothing to copy it returns `d` itself, so History adds no undo
 * step.
 */
export function mirrorLeftToRight(d: StageDesign): StageDesign {
  let next = d;
  const trussIds = new Map<string, string>();
  for (const t of d.trusses) {
    const twin = twinOf(t, d.trusses);
    if (twin) trussIds.set(t.id, twin.id);
    if (twin || !isLeft(t)) continue;
    const id = newTrussId(next, t.params.kind);
    trussIds.set(t.id, id);
    next = { ...next, trusses: [...next.trusses, mirrorTruss(t, id)] };
  }
  const left = d.fixtures.filter((f) => f.position[0] < -CENTRE_LINE_M);
  const sources = left.filter((f) => !d.fixtures.some((o) => isSameSpot(o.position, mirrorPoint(f.position))));
  if (next === d && !sources.length) return d;
  const trussOf = (f: StageFixture): string | null => (f.trussId ? (trussIds.get(f.trussId) ?? null) : null);
  return appendCopies(next, sources.map(mirrorFixture), trussOf);
}

/** The truss of the same kind that stands where `t`'s mirror image would; points compare in any order. */
function twinOf(t: StageTruss, trusses: readonly StageTruss[]): StageTruss | undefined {
  const image = worldPoints(mirrorTruss(t, t.id));
  return trusses.find((o) => o.params.kind === t.params.kind && isSamePointSet(worldPoints(o), image));
}

/** Left when no point is right of the centre line and at least one is clearly left of it. */
function isLeft(t: StageTruss): boolean {
  const points = worldPoints(t);
  return points.every((p) => p[0] < CENTRE_LINE_M) && points.some((p) => p[0] < -CENTRE_LINE_M);
}

function worldPoints(t: StageTruss): Vec3[] {
  return trussPoints(t).map((v) => v.toArray());
}

function isSamePointSet(points: readonly Vec3[], others: readonly Vec3[]): boolean {
  const isIn = (set: readonly Vec3[]) => (p: Vec3) => set.some((o) => isSameSpot(p, o));
  return points.length === others.length && points.every(isIn(others)) && others.every(isIn(points));
}
