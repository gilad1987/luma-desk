/**
 * Owns the invariants of the four built-in stage templates: fixture counts, the internal links of each design
 * (unique ids, truss and screen references), JSON safety, and the circle-truss rotation rule. The Sultan's Pool
 * parity lives in sultansPoolTemplate.test.ts; rig derivation and the parser are tested elsewhere.
 */
import { describe, expect, it } from 'vitest';
import { createTemplate, TEMPLATE_IDS } from '../../../../src/domain/stage/templates/index.ts';
import { jsonRoundTrip } from '../../../shared/index.ts';

const COUNTS = { empty: 0, theatre: 30, festival: 147, 'sultans-pool': 405 } as const;

describe.each(TEMPLATE_IDS)('template %s', (id) => {
  const d = createTemplate(id);

  it('has the planned fixture count and unique fixture and truss ids', () => {
    expect(d.fixtures).toHaveLength(COUNTS[id]);
    expect(new Set(d.fixtures.map((f) => f.id)).size).toBe(d.fixtures.length);
    expect(new Set(d.trusses.map((t) => t.id)).size).toBe(d.trusses.length);
    expect(d.source).toEqual({ kind: 'template', name: id });
  });

  it('links every fixture to an existing truss and every screen to a screen fixture', () => {
    const trussIds = new Set(d.trusses.map((t) => t.id));
    for (const f of d.fixtures) if (f.trussId !== null) expect(trussIds, `fixture ${f.id}`).toContain(f.trussId);
    for (const s of d.screens) expect(d.fixtures.find((f) => f.id === s.fixtureId)?.type).toBe('screen');
  });

  it('survives a JSON round trip unchanged', () => {
    // JSON writes -0 as 0 and the legacy ring pixel tangents hold -0; both are the same number, so compare with ===.
    expect.addEqualityTesters([(a, b) => (typeof a === 'number' && typeof b === 'number' ? a === b : undefined)]);
    expect(jsonRoundTrip(d)).toStrictEqual(d);
  });
});

describe('festival circle truss', () => {
  it('turns every ring fixture so its body front faces the ring centre', () => {
    const d = createTemplate('festival');
    const ring = d.fixtures.filter((f) => f.trussId === 'ring');
    expect(ring).toHaveLength(24);
    for (const f of ring) {
      const [, qy = 0, , qw = 1] = f.rotation ?? [];
      const yaw = 2 * Math.atan2(qy, qw);
      const front = [Math.sin(yaw), Math.cos(yaw)];
      const toCentre = [0 - f.position[0], -8 - f.position[2]].map((v) => v / 6);
      expect(front[0]).toBeCloseTo(toCentre[0] ?? NaN, 9);
      expect(front[1]).toBeCloseTo(toCentre[1] ?? NaN, 9);
    }
  });
});
