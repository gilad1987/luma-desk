/**
 * Owns `autoGroupsOf`: on the Sultan's Pool design it must equal the old Auto Show `AG` ranges (copied below from
 * main.ts as the oracle), and every key must keep its own array, because `genLook` compares groups by identity.
 */
import { describe, expect, it } from 'vitest';
import type { Rig } from '../../../../src/domain/rig/Rig.ts';
import { autoGroupsOf } from '../../../../src/domain/stage/autoSlots.ts';
import { rigFromDesign } from '../../../../src/domain/stage/deriveRig.ts';
import { createTemplate } from '../../../../src/domain/stage/templates/index.ts';
import { sultansPool } from '../../../../src/domain/stage/templates/sultansPool/index.ts';

/** The old `AG` object of main.ts, key for key. */
const oldAG = (rig: Rig): Record<string, number[]> => ({
  audW: rig.range(1801, 1899),
  towB: rig.range(1601, 1699),
  towW: rig.range(1701, 1799),
  ring: rig.range(1201, 1299),
  rwash: rig.range(1301, 1399),
  angB: rig.range(1401, 1499),
  angS: rig.range(1501, 1599),
  foh: rig.range(101, 199),
  t2: rig.range(201, 299),
  t3: rig.range(301, 399),
  t4: rig.range(401, 499),
  back: rig.range(501, 599),
  tow: rig.range(601, 699),
  floor: rig.range(701, 799),
  fwash: rig.range(1001, 1099),
  pars: rig.range(1101, 1199),
  blind: rig.range(801, 899),
  strobe: rig.range(901, 999),
  bars: rig.range(2101, 2199),
  follow: rig.range(1901, 1999),
  prof: rig.range(2201, 2299),
});

describe('autoGroupsOf', () => {
  it("equals the old AG ranges on the Sultan's Pool design, key order included", () => {
    const design = sultansPool();
    const rig = rigFromDesign(design);
    const groups = autoGroupsOf(rig, design);
    expect(groups).toEqual(oldAG(rig));
    expect(Object.keys(groups)).toEqual(Object.keys(oldAG(rig)));
  });

  it('gives every key its own array, also when all are empty', () => {
    const empty = createTemplate('empty');
    const arrays = Object.values(autoGroupsOf(rigFromDesign(empty), empty));
    expect(arrays).toHaveLength(21);
    expect(arrays.every((ids) => ids.length === 0)).toBe(true);
    expect(new Set(arrays).size).toBe(21);
  });
});
