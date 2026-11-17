/**
 * Owns the spots template fixtures stand on: no two fixtures of a template share a spot, and a builder batch on a
 * template truss (straight, circle, tower) finds the template fixtures on its first lane and moves one lane. A wrong
 * hang drop, a tower drop or a missing ring `phase` breaks one of them. Counts and links live in templates.test.ts.
 */
import { describe, expect, it } from 'vitest';
import { addFixturesOnTruss, isSameSpot } from '../../../../src/domain/stage/edit/addFixtures.ts';
import { createTemplate, TEMPLATE_IDS } from '../../../../src/domain/stage/templates/index.ts';
import { placesOnTruss } from '../../../../src/domain/stage/trussPlaces.ts';

describe.each(TEMPLATE_IDS)('template %s', (id) => {
  it('has no two fixtures on the same spot', () => {
    const { fixtures } = createTemplate(id);
    const shared = fixtures.flatMap((f, i) =>
      fixtures.slice(i + 1).flatMap((o) => (isSameSpot(f.position, o.position) ? [`${f.id}/${o.id}`] : [])),
    );
    expect(shared).toEqual([]);
  });
});

describe('a builder batch on a festival truss', () => {
  const d = createTemplate('festival');

  it.each([
    ['front', 'straight', 'spot', 12],
    ['ring', 'circle', 'beam', 16],
    ['tower-1', 'tower', 'wash', 4],
  ] as const)('on %s (%s) lands on the template spots and moves one lane', (trussId, kind, type, count) => {
    const truss = d.trusses.find((t) => t.id === trussId);
    if (!truss) throw new Error(`festival has no truss ${trussId}`);
    expect(truss.params.kind).toBe(kind);
    const template = d.fixtures.filter((f) => f.trussId === trussId && f.type === type);
    const firstLane = placesOnTruss(truss, count, 0);
    expect(template.every((f, i) => isSameSpot(f.position, firstLane[i]?.position ?? [NaN, NaN, NaN]))).toBe(true);
    const added = addFixturesOnTruss(d, { trussId, type, count }).fixtures.slice(d.fixtures.length);
    expect(added.map((f) => f.position)).toEqual(placesOnTruss(truss, count, 1).map((p) => p.position));
  });
});
