/**
 * Owns the Sultan's Pool template's roles and truss links: the fixture count per role, which roles stand on no truss,
 * how close a linked fixture hangs to its truss, and the role table's guard against unknown ids. Parity with the
 * legacy rig lives in sultansPoolTemplate.test.ts.
 */
import { Line3, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { createTemplate } from '../../../../src/domain/stage/templates/index.ts';
import { placeOf } from '../../../../src/domain/stage/templates/sultansPool/fixtureRoles.ts';
import type { StageTruss } from '../../../../src/domain/stage/trussTypes.ts';
import type { Vec3 } from '../../../../src/domain/stage/types.ts';

/** Distance (m) from `p` to the truss line: the a-b segment, or the circle; Sultan's Pool trusses have no rotation. */
function offTruss(p: Vec3, t: StageTruss): number {
  const [ox, oy, oz] = t.transform.position;
  const q = new Vector3(p[0] - ox, p[1] - oy, p[2] - oz);
  if (t.params.kind === 'circle') return Math.hypot(Math.hypot(q.x, q.z) - t.params.radius, q.y);
  if (t.params.kind !== 'straight' && t.params.kind !== 'tower') return Infinity;
  return new Line3(new Vector3(...t.params.a), new Vector3(...t.params.b))
    .closestPointToPoint(q, true, new Vector3())
    .distanceTo(q);
}

/** The number of fixtures per role among `roles`. */
function countByRole(roles: readonly string[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const role of roles) counts[role] = (counts[role] ?? 0) + 1;
  return counts;
}

describe("Sultan's Pool roles and truss links", () => {
  const d = createTemplate('sultans-pool');

  it('gives each role its planned fixture count', () => {
    expect(countByRole(d.fixtures.map((f) => f.role))).toEqual({
      front: 38,
      blinder: 16,
      mid: 80,
      strobe: 20,
      back: 30,
      side: 24,
      floor: 96,
      screen: 1,
      ring: 36,
      angled: 36,
      follow: 4,
      footlight: 12,
      profile: 12,
    });
  });

  it('leaves only floor fixtures, footlights and the screen without a truss', () => {
    const loose = d.fixtures.filter((f) => f.trussId === null).map((f) => f.role);
    expect(countByRole(loose)).toEqual({ floor: 76, screen: 1, footlight: 12 });
  });

  it('places every fixture with a truss link within 1.6 m of that truss line', () => {
    const far = d.fixtures.filter((f) => {
      const t = d.trusses.find((x) => x.id === f.trussId);
      return t !== undefined && offTruss(f.position, t) > 1.6;
    });
    expect(far.map((f) => f.id)).toEqual([]);
  });

  it('throws on a fixture id outside the role table, naming the id', () => {
    expect(() => placeOf(9999)).toThrow(/9999/);
  });
});
