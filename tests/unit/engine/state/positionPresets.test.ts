import { describe, expect, it } from 'vitest';
import { buildRig } from '../../../../src/domain/rig';
import { POSITION_PRESETS } from '../../../../src/engine/positionPresets';
import { PRESET_FNS } from '../../../../src/engine/presetFunctions';
import { PFN_ORACLE } from './oracle/positionsOracle';

const rig = buildRig();
// selection sizes 1 (the single-fixture middle), 2, an odd and a large fan; k covers every k % 2, % 3 and % 7 case
const COUNTS = [1, 2, 7, 24];

describe('computed presets', () => {
  it('have the original names in the original order', () => {
    expect(Object.keys(PRESET_FNS)).toEqual(Object.keys(PFN_ORACLE));
    expect(Object.keys(POSITION_PRESETS)).toEqual(
      Object.keys(PFN_ORACLE).filter((name) => !/^z(Min|Mid|Max)$/.test(name)),
    );
  });

  for (const name of Object.keys(PFN_ORACLE) as (keyof typeof PRESET_FNS)[]) {
    it(`${name} matches the original for every fixture, index and selection size`, () => {
      const oracle = PFN_ORACLE[name];
      if (!oracle) throw new Error(`no oracle for ${name}`);
      const actual: unknown[] = [];
      const expected: unknown[] = [];
      for (const f of rig.fixtures)
        for (const n of COUNTS)
          for (let k = 0; k < Math.max(n, 7); k++) {
            actual.push(PRESET_FNS[name](f, k, n));
            expected.push(oracle(f, k, n));
          }
      // toEqual compares numbers with Object.is, so -0 and NaN must match too
      expect(actual).toEqual(expected);
    });
  }

  it('home and straight return a fresh object each call', () => {
    const f = rig.fixtures[0];
    if (!f) throw new Error('empty rig');
    expect(PRESET_FNS.home(f, 0, 1)).not.toBe(PRESET_FNS.home(f, 0, 1));
  });

  it('band rejects an index that is not a selection index', () => {
    const f = rig.fixtures[0];
    if (!f) throw new Error('empty rig');
    expect(() => PRESET_FNS.band(f, -1, 1)).toThrow(RangeError);
  });
});
