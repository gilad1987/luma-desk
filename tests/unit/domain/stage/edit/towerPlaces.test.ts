/**
 * Owns where `addFixturesOnTruss` puts fixtures on a tower: beside the column, 0.4 m toward the stage centre (downstage
 * for a tower on the centre line), spread from the base up with no hang drop, so none goes below the tower base. Other truss kinds are owned by
 * addFixtures.test.ts.
 */
import { describe, expect, it } from 'vitest';
import { addFixturesOnTruss } from '../../../../../src/domain/stage/edit/addFixtures.ts';
import { addPresetTruss } from '../../../../../src/domain/stage/edit/trussOps.ts';
import type { Vec3 } from '../../../../../src/domain/stage/types.ts';
import { sampleDesign } from './sampleDesign.ts';

/** Twelve washes on a 6 m preset tower standing on a 1 m deck at `at`. */
const onTower = (at: Vec3): Vec3[] => {
  const withTower = addPresetTruss({ ...sampleDesign(), trusses: [], fixtures: [] }, 'tower', at);
  return addFixturesOnTruss(withTower, { trussId: 'tower-1', type: 'wash', count: 12 }).fixtures.map((f) => f.position);
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
    expect(new Set(places.map(([x, , z]) => `${x} ${z.toFixed(9)}`))).toEqual(new Set(['0 -1.600000000']));
    expect(places.every(([x, , z]) => Math.hypot(x, z + 2) > 0.2)).toBe(true);
  });
});
