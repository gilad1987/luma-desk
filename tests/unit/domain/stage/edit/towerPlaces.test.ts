/**
 * Owns where `addFixturesOnTruss` puts fixtures on a tower: beside the column, 0.4 m toward the stage centre (downstage
 * for a tower less than one step from the centre line), spread from the base up with no hang drop, so none goes below
 * the tower base; the step is chosen once per tower, so a tilted tower does not split. Other truss kinds are owned by
 * addFixtures.test.ts.
 */
import { describe, expect, it } from 'vitest';
import { addFixturesOnTruss } from '../../../../../src/domain/stage/edit/addFixtures.ts';
import { addPresetTruss } from '../../../../../src/domain/stage/edit/trussOps.ts';
import type { StageTruss } from '../../../../../src/domain/stage/trussTypes.ts';
import type { Vec3 } from '../../../../../src/domain/stage/types.ts';
import { rounded, sampleDesign } from './sampleDesign.ts';

/** Twelve washes on a 6 m preset tower standing on a 1 m deck at `at`. */
const onTower = (at: Vec3): Vec3[] => {
  const withTower = addPresetTruss({ ...sampleDesign(), trusses: [], fixtures: [] }, 'tower', at);
  return addFixturesOnTruss(withTower, { trussId: 'tower-1', type: 'wash', count: 12 }).fixtures.map((f) => f.position);
};

/** The second batch of twelve washes on the same tower: it lands on the first, so it moves one lane. */
const secondBatch = (at: Vec3): Vec3[] => {
  const withTower = addPresetTruss({ ...sampleDesign(), trusses: [], fixtures: [] }, 'tower', at);
  const once = addFixturesOnTruss(withTower, { trussId: 'tower-1', type: 'wash', count: 12 });
  const twice = addFixturesOnTruss(once, { trussId: 'tower-1', type: 'wash', count: 12 });
  return twice.fixtures.slice(12).map((f) => f.position);
};

describe('addFixturesOnTruss on a tower', () => {
  it('keeps all 12 fixtures of a 6 m tower at or above the tower base, spread to the top', () => {
    const ys = onTower([-4, 1, -2]).map((p) => p[1]);
    expect(ys.every((y) => y >= 1 && y <= 7)).toBe(true);
    expect(ys).toEqual([...ys].sort((a, b) => a - b));
  });

  it('stands each fixture 0.4 m toward the stage centre, on either side', () => {
    expect(new Set(onTower([-4, 1, -2]).map((p) => p[0]))).toEqual(new Set([-3.6]));
    expect(new Set(onTower([4, 1, -2]).map((p) => p[0]))).toEqual(new Set([3.6]));
  });

  it('stands each fixture of a tower at x = 0 0.4 m downstage, outside the 0.4 m column', () => {
    const places = onTower([0, 1, -2]);
    expect(new Set(places.map(([x, , z]) => rounded([x, z]).join(' ')))).toEqual(new Set(['0 -1.6']));
    expect(places.every(([x, , z]) => Math.hypot(x, z + 2) > 0.2)).toBe(true);
  });

  it('moves a second batch on a tower at x = 0 one more lane downstage, away from the column, not into it', () => {
    expect(new Set(secondBatch([0, 1, -2]).map(([x, , z]) => rounded([x, z]).join(' ')))).toEqual(new Set(['0 -1.2']));
  });

  it('moves a second batch on a side tower one lane upstage, still 0.4 m toward the stage centre', () => {
    expect(new Set(secondBatch([-4, 1, -2]).map(([x, , z]) => rounded([x, z]).join(' ')))).toEqual(
      new Set(['-3.6 -2.4']),
    );
  });

  it('steps downstage, never across x = 0, for a tower less than one step off the centre line', () => {
    for (const x of [0.2, -0.2]) {
      const places = onTower([x, 1, -2]);
      expect(new Set(places.map((p) => rounded([p[0], p[2]]).join(' ')))).toEqual(new Set([`${x} -1.6`]));
    }
  });

  // Six places from x = -0.5 to 0.5: a step chosen per place would move the outer four in x, not downstage.
  it('steps a whole tilted tower at x = 0 downstage, chosen once from its world centre', () => {
    const tilted: StageTruss = {
      id: 'tilt-1',
      name: 'Tilted tower',
      role: 'side',
      transform: { position: [0, 1, -2] },
      params: { kind: 'tower', a: [-0.6, 0, 0], b: [0.6, 6, 0], section: 0.3 },
    };
    const design = { ...sampleDesign(), trusses: [tilted], fixtures: [] };
    const added = addFixturesOnTruss(design, { trussId: 'tilt-1', type: 'wash', count: 6 }).fixtures;
    const onLine = [-0.5, -0.3, -0.1, 0.1, 0.3, 0.5].map((x) => [x, -1.6]);
    expect(added.map((f) => rounded([f.position[0], f.position[2]]))).toEqual(onLine);
  });
});
