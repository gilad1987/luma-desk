import type { Rig } from '../../../../src/domain/rig';
import { genLookEnd } from './legacyLookEnd';
import { genLookSpots } from './legacyLookSpots';
import { genLookStart } from './legacyLookStart';
import { STYLES_A } from './legacyStylesA';
import { STYLES_B } from './legacyStylesB';
import { STYLES_C } from './legacyStylesC';
import type { LegacyCue, LegacyEnv, LegacyStyle } from './legacyTypes';

// Reference oracle: SEC_NAMES 2557, STYLES 2558-2568 and AG 2569 from index.html (index.base.html), formatted by
// Prettier. Changes: types; AG is built from a given rig (range() -> rig.range()); STYLES is split over three files.

export const SEC_NAMES: Record<string, string> = {
  groove: 'Groove',
  verse: 'Verse',
  chorus: 'Chorus',
  hook: 'Hook',
  build: 'Build-up',
  drop: 'Drop',
  intro: 'Intro',
};

export const LEGACY_STYLES: Record<string, LegacyStyle> = { ...STYLES_A, ...STYLES_B, ...STYLES_C };

export const legacyGroups = (rig: Rig) => ({
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

/** The globals genLook read, for one rig and one set of `auto` fields. */
export function legacyEnv(rig: Rig, auto: LegacyEnv['auto']): LegacyEnv {
  const FX = new Map(rig.fixtures.map((f) => [f.id, f]));
  return { fixtures: rig.fixtures, FX, AG: legacyGroups(rig), auto };
}

/** The original genLook(S, sec), drawing from the global Math.random like the original. */
export function genLook(env: LegacyEnv, S: LegacyStyle, sec: string): LegacyCue {
  const locals = genLookStart(env, S, sec);
  genLookSpots(env, S, locals);
  return genLookEnd(env, S, sec, locals);
}
