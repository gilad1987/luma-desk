/**
 * Owns the Sultan's Pool template's parity with the legacy rig: its fixtures against `buildRig()` and its truss list
 * against the legacy truss code (order, kinds, float expressions). Roles and truss links live in
 * sultansPoolRoles.test.ts; the invariants every template shares live in templates.test.ts.
 */
import { describe, expect, it } from 'vitest';
import { buildRig } from '../../../../src/domain/rig/index.ts';
import { ANG, DECK, RING, ROOF, TOWERS, TR } from '../../../../src/domain/venue.ts';
import { createTemplate } from '../../../../src/domain/stage/templates/index.ts';

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
});
