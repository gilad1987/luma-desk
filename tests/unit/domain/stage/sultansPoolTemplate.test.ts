/**
 * Owns the Sultan's Pool template's parity with the legacy rig: its fixtures against `buildRig()`, its truss list
 * against the legacy truss code (order, kinds, float expressions) and the role table's guard against unknown ids.
 * The invariants every template shares live in templates.test.ts.
 */
import { Line3, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { buildRig } from '../../../../src/domain/rig/index.ts';
import { ANG, DECK, RING, ROOF, TOWERS, TR } from '../../../../src/domain/venue.ts';
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

describe("Sultan's Pool template", () => {
  const d = createTemplate('sultans-pool');
  const truss = (id: string) => d.trusses.find((t) => t.id === id)?.params;

  it('equals buildRig() field by field, in build order', () => {
    const expected = buildRig().fixtures.map((f) => ({
      id: f.id,
      type: f.type,
      mount: f.mount,
      position: f.pos.toArray(),
      ...(f.fixed ? { fixed: f.fixed } : {}),
      ...(f.pix ? { pixel: { p: f.pix.p.toArray(), tan: f.pix.tan.toArray(), len: f.pix.len } } : {}),
    }));
    const links = d.fixtures.map((f) => ({ role: f.role, trussId: f.trussId }));
    expect(d.fixtures).toStrictEqual(expected.map((e, i) => ({ ...e, ...links[i] })));
    expect(d.fixtures.some((f) => 'rotation' in f)).toBe(false);
  });

  it('lists the trusses in the legacy creation order and kinds', () => {
    const kinds = (k: string, n: number): string[] => Array<string>(n).fill(k);
    expect(d.trusses.map((t) => t.params.kind)).toEqual([
      ...kinds('straight', 5),
      ...kinds('tower', 6),
      ...kinds('straight', 5),
      ...kinds('tower', 6),
      'roof',
      ...kinds('circle', 2),
      ...kinds('tower', 12),
      ...kinds('straight', 6),
    ]);
    expect(d.trusses.slice(0, 5).map((t) => t.id)).toEqual(Object.keys(TR));
  });

  it('uses the legacy truss expressions, so the floats match', () => {
    expect(truss('front')).toMatchObject({ a: [-25.5, TR.front.y, TR.front.z], section: 0.52 });
    expect(truss('ladder-1')).toMatchObject({ a: [-1 * 23.6 + -1 * 0.4, DECK, -3], b: [-24, 19.5, -3] });
    const [x, z, H] = TOWERS[0] ?? [0, 0, 0];
    expect(truss('tower-1')).toMatchObject({ b: [x, DECK + H, z] });
    expect(truss('tower-1')).toMatchObject({ parts: [{}, {}, { at: [x, DECK + H * 0.55 - 0.45, z + 0.45] }] });
    expect(truss('angled-1')).toMatchObject({
      a: ANG[0]?.a.toArray(),
      chains: [ANG[0]?.a.toArray(), ANG[0]?.b.toArray()],
    });
    expect(truss('ring-outer')).toEqual({
      kind: 'circle',
      radius: RING.R,
      section: 0.5,
      chains: { count: 6, phase: 0.26 },
    });
    expect(d.trusses.find((t) => t.id === 'roof')?.transform.position).toEqual([0, ROOF + 0.7, -7.9]);
    expect(d.venue).toEqual({ kind: 'sultans-pool', gridY: ROOF });
  });

  it('gives each role its planned fixture count', () => {
    const counts: Record<string, number> = {};
    for (const f of d.fixtures) counts[f.role] = (counts[f.role] ?? 0) + 1;
    expect(counts).toEqual({
      ...{ front: 38, blinder: 16, mid: 80, strobe: 20, back: 30, side: 24, floor: 96, screen: 1, ring: 36 },
      ...{ angled: 36, follow: 4, footlight: 12, profile: 12 },
    });
  });

  it('places every fixture with a truss link within 1.6 m of that truss line', () => {
    const far = d.fixtures.filter((f) => {
      const t = d.trusses.find((x) => x.id === f.trussId);
      return t !== undefined && offTruss(f.position, t) > 1.6;
    });
    expect(far.map((f) => f.id)).toEqual([]);
    expect(d.fixtures.filter((f) => f.trussId !== null)).toHaveLength(405 - 40 - 16 - 20 - 1 - 12);
  });

  it('throws on a fixture id outside the role table, naming the id', () => {
    expect(() => placeOf(9999)).toThrow(/9999/);
  });
});
