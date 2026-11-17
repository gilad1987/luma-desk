import { clamp } from '../../../../src/core';
import type { Fixture } from '../../../../src/domain/Fixture';
import { COLORS } from '../../../../src/engine/presetColors';
import { PHASER_TYPES } from '../../../../src/engine/shared';
import { PFN_ORACLE } from '../../engine/state/oracle/positionsOracle';
import type { LegacyColor, LegacyEnv, LegacyFn, LegacySet, LegacyVals } from './legacyTypes';

// Reference oracle: pickR 2555, COL 2556, has 1574 and genLook's set() 2573-2574 from index.html (index.base.html),
// formatted by Prettier. Changes: types, and lookups that throw where the original read a field of undefined. PFN is
// the original position table (positionsOracle); FXT sizes come from PHASER_TYPES, which the engine tests pin.

export const pickR = <T>(a: readonly T[]): T => a[Math.floor(Math.random() * a.length)] as T;

export const COL = (n: string): LegacyColor => {
  const c = COLORS.find((x) => x[0] === n);
  if (!c) throw new Error(`no colour ${n}`);
  return { r: c[1], g: c[2], b: c[3] };
};

const has = (f: Fixture, a: string) => (f.T.attrs as readonly string[]).includes(a);

export function pfn(name: string): LegacyFn {
  const fn = PFN_ORACLE[name];
  if (!fn) throw new Error(`no position preset ${name}`);
  return fn;
}

export function fxt(type: string): { size: number } {
  const spec = (PHASER_TYPES as Record<string, { size: number } | undefined>)[type];
  if (!spec) throw new Error(`no phaser type ${type}`);
  return spec;
}

export const legacySet =
  (env: LegacyEnv, vals: Record<string, LegacyVals>): LegacySet =>
  (ids, o) =>
    ids.forEach((id, k) => {
      const f = env.FX.get(id);
      if (!f) throw new Error(`no fixture ${id}`);
      const v = typeof o === 'function' ? o(f, k, ids.length) : o;
      const out = (vals[id] = vals[id] || {});
      for (const a in v) if (has(f, a)) out[a] = a === 'zoom' ? clamp(v[a] as number, f.T.zr[0], f.T.zr[1]) : v[a];
    });
