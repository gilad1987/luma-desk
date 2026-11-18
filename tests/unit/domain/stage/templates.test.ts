/**
 * Owns the invariants of the four built-in stage templates: fixture counts, the internal links of each design
 * (unique ids, truss and screen references), JSON safety, the per-truss layout of theatre and festival, and the
 * circle-truss rotation rule. Fixture spots live in templateSpots.test.ts, the Sultan's Pool parity in
 * sultansPoolTemplate.test.ts; rig derivation and the parser are tested elsewhere.
 */
import { Quaternion, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { dirFrom } from '../../../../src/domain/aim.ts';
import type { StageDesign } from '../../../../src/domain/stage/StageDesign.ts';
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

/** [trussId, type, count] per run of equal fixtures, in id order, so a moved or retyped block shows up. */
function trussTable(d: StageDesign): [string | null, string, number][] {
  const rows: [string | null, string, number][] = [];
  for (const f of d.fixtures) {
    const last = rows.at(-1);
    if (last && last[0] === f.trussId && last[1] === f.type) last[2] += 1;
    else rows.push([f.trussId, f.type, 1]);
  }
  return rows;
}

describe('per-truss layout', () => {
  it('theatre: front truss, three pipes, floor pars; a black box without crowd or LED wall', () => {
    const d = createTemplate('theatre');
    expect(trussTable(d)).toEqual([
      ['front', 'spot', 6],
      ['front', 'blinder', 2],
      ['pipe-1', 'wash', 6],
      ['pipe-2', 'spot', 4],
      ['pipe-2', 'strobe', 2],
      ['pipe-3', 'beam', 6],
      [null, 'par', 4],
    ]);
    expect([d.scenery.crowd, d.scenery.ledWall]).toEqual([false, false]);
  });

  it('festival: four straights, the ring, four towers, floor rows and the screen', () => {
    const towers = [1, 2, 3, 4].map((i): [string, string, number] => [`tower-${i}`, 'wash', 4]);
    expect(trussTable(createTemplate('festival'))).toEqual([
      ['front', 'spot', 12],
      ['front', 'blinder', 8],
      ['front', 'follow', 2],
      ['mid-1', 'beam', 16],
      ['mid-1', 'strobe', 8],
      ['mid-2', 'wash', 16],
      ['back', 'beam', 16],
      ['ring', 'beam', 16],
      ['ring', 'wash', 8],
      ...towers,
      [null, 'beam', 12],
      [null, 'par', 8],
      [null, 'bar', 8],
      [null, 'screen', 1],
    ]);
  });
});

describe('festival circle truss', () => {
  it('turns every ring body so a beam at pan 0, tilt 45 points its horizontal part at the ring centre', () => {
    const ring = createTemplate('festival').fixtures.filter((f) => f.trussId === 'ring');
    expect(ring).toHaveLength(24);
    for (const f of ring) {
      const beam = dirFrom({ mount: 'hang', rotation: new Quaternion(...(f.rotation ?? [])) }, 0, 45, new Vector3());
      const toCentre = new Vector3(0 - f.position[0], 0, -8 - f.position[2]).normalize();
      expect(beam.y, `fixture ${f.id}`).toBeCloseTo(-Math.SQRT1_2, 9);
      expect(new Vector3(beam.x, 0, beam.z).normalize().dot(toCentre), `fixture ${f.id}`).toBeCloseTo(1, 9);
    }
  });
});
