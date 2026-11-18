/**
 * QA5: tower placement on both sides and on the centre line, and the no-op identity of setDeckSize, setLedWall and
 * setTrussProps on a template and after an edit. Catches a sign slip in `besideColumn` and a size compare that only
 * holds for the sample's round numbers. The plain cases are owned by towerPlaces.test.ts and noOps.test.ts.
 */
import { describe, expect, it } from 'vitest';
import { addFixturesOnTruss } from '../../../../../src/domain/stage/edit/addFixtures.ts';
import { setDeckSize } from '../../../../../src/domain/stage/edit/deckOps.ts';
import { setLedWall } from '../../../../../src/domain/stage/edit/ledWall.ts';
import { addPresetTruss, setTrussProps } from '../../../../../src/domain/stage/edit/trussOps.ts';
import type { StageDesign } from '../../../../../src/domain/stage/StageDesign.ts';
import { createTemplate } from '../../../../../src/domain/stage/templates/index.ts';
import type { Vec3 } from '../../../../../src/domain/stage/types.ts';
import { sampleDesign } from '../edit/sampleDesign.ts';

/** The x of 3 spots placed on a fresh 6 m preset tower at `at`. */
const towerXs = (at: Vec3): number[] => {
  const withTower = addPresetTruss({ ...sampleDesign(), trusses: [], fixtures: [] }, 'tower', at);
  return addFixturesOnTruss(withTower, { trussId: 'tower-1', type: 'spot', count: 3 }).fixtures.map(
    (f) => f.position[0],
  );
};

describe('QA5 tower placement by side', () => {
  it('steps 0.4 m toward x = 0 from a tower at x < 0 and at x > 0', () => {
    expect([towerXs([-2.5, 0, 0]), towerXs([7, 0, 0])]).toEqual([
      [-2.1, -2.1, -2.1],
      [6.6, 6.6, 6.6],
    ]);
  });

  it('keeps fixtures on the column line of a tower at x = 0 (besideColumn TSDoc)', () => {
    expect(towerXs([0, 0, -3])).toEqual([0, 0, 0]);
  });

  it('keeps every fixture of a tower at x = 0.2 on its own side of x = 0', () => {
    expect(towerXs([0.2, 0, -3]).every((x) => x > 0)).toBe(true);
  });

  it('places the festival tower washes beside their columns, 0.4 m inward', () => {
    const festival = createTemplate('festival');
    const xs = new Set(festival.fixtures.filter((f) => f.trussId?.startsWith('tower-')).map((f) => f.position[0]));
    expect(xs).toEqual(new Set([-16.1, 16.1]));
  });
});

const festival = (): StageDesign => createTemplate('festival');

describe('QA5 no-op identity on a template', () => {
  it('returns the festival itself for its own deck size, LED wall size and tower params', () => {
    const d = festival();
    const tower = d.trusses.find((t) => t.id === 'tower-1');
    const params = tower ? { ...tower.params } : undefined;
    expect([
      setDeckSize(d, { width: 30, depth: 16, height: 1.8 }) === d,
      setLedWall(d, { width: 20, height: 8 }) === d,
      setTrussProps(d, 'tower-1', { name: 'Side tower 1', role: 'side', ...(params ? { params } : {}) }) === d,
    ]).toEqual([true, true, true]);
  });

  it('returns a new design when one value differs, so a real edit still records', () => {
    const d = festival();
    expect([
      setDeckSize(d, { width: 30, depth: 16, height: 1.9 }) === d,
      setLedWall(d, { width: 20, height: 7 }) === d,
      setTrussProps(d, 'tower-1', { role: 'mid' }) === d,
    ]).toEqual([false, false, false]);
  });
});

describe('QA5 no-op identity when the same size is set twice', () => {
  // setDeckSize stores z0 = z1 - depth, and 4 - (4 - 0.3) is 0.2999999999999998: only a tolerant compare sees the
  // same depth again, so no empty undo step is added.
  it('setDeckSize returns the design itself for the depth it just set', () => {
    const once = setDeckSize(sampleDesign(), { width: 12, depth: 0.3, height: 1 });
    expect(setDeckSize(once, { width: 12, depth: 0.3, height: 1 })).toBe(once);
  });

  // addWall stores y1 = y0 + height, and on the 1.8 m festival deck 3.8 - 1.8 is 1.9999999999999998: only a
  // tolerant compare sees the same wall size again.
  it('setLedWall returns the design itself for the wall size it just set on a 1.8 m deck', () => {
    const once = setLedWall(setLedWall(festival(), null), { width: 6, height: 2 });
    expect(setLedWall(once, { width: 6, height: 2 })).toBe(once);
  });
});
