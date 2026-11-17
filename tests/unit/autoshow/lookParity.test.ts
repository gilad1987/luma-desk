import { afterEach, describe, expect, it, vi } from 'vitest';
import { rng } from '../../../src/core';
import { buildRig } from '../../../src/domain/rig';
import type { LookOptions } from '../../../src/autoshow/AutoSettings';
import { LookGenerator } from '../../../src/autoshow/LookGenerator';
import type { Section } from '../../../src/autoshow/sections';
import { STYLES, type AutoStyleId } from '../../../src/autoshow/styles';
import { he } from '../../../src/i18n/he';
import { genLook, LEGACY_STYLES, legacyEnv } from './oracle/legacyGenLook';

const rig = buildRig();
const STYLE_IDS = Object.keys(STYLES) as AutoStyleId[];
const SECTIONS: readonly Section[] = ['groove', 'verse', 'chorus', 'hook', 'build', 'drop', 'intro'];
const SEEDS = [1, 2, 3, 7, 42, 99, 1234, 20261117];
// default panel, low energy with strobes and screen off, full energy with the screen off
const PANEL_DEFAULT: LookOptions = { energy: 0.85, strobes: true, screen: true };
const QUIET: LookOptions = { energy: 0.3, strobes: false, screen: false };
const OPTIONS: readonly LookOptions[] = [PANEL_DEFAULT, QUIET, { energy: 1, strobes: true, screen: false }];

/** The original look for these inputs, with `Math.random` seeded exactly as the ?test build seeds it. */
function oracleLook(id: AutoStyleId, sec: Section, options: LookOptions, seed: number) {
  const random = rng(seed);
  vi.spyOn(Math, 'random').mockImplementation(random);
  const style = LEGACY_STYLES[id];
  if (!style) throw new Error(`oracle has no style ${id}`);
  const look = genLook(legacyEnv(rig, options), style, sec);
  vi.restoreAllMocks();
  return { look, next: random() };
}

afterEach(() => vi.restoreAllMocks());

describe('LookGenerator parity with the original genLook', () => {
  it('builds the same look and draws the same randoms for every style, section, seed and option set', () => {
    const mismatches: string[] = [];
    let compared = 0;
    for (const id of STYLE_IDS)
      for (const sec of SECTIONS)
        for (const options of OPTIONS)
          for (const seed of SEEDS) {
            const expected = oracleLook(id, sec, options, seed);
            const random = rng(seed);
            const look = new LookGenerator(rig, random).generate(STYLES[id], sec, options);
            compared++;
            // JSON text also pins the key order of every nested object (vals, attribute order, fx fields, sec)
            if (JSON.stringify(look) !== JSON.stringify(expected.look) || random() !== expected.next)
              mismatches.push(`${id}/${sec}/${options.energy}/${seed}`);
            else expect(look).toStrictEqual(expected.look);
          }
    expect(compared).toBe(STYLE_IDS.length * SECTIONS.length * OPTIONS.length * SEEDS.length);
    expect(compared).toBe(1512);
    expect(mismatches).toEqual([]);
  });

  it('uses Math.random by default, so the seeded ?test build keeps its looks', () => {
    for (const id of STYLE_IDS) {
      const expected = oracleLook(id, 'drop', PANEL_DEFAULT, 5);
      vi.spyOn(Math, 'random').mockImplementation(rng(5));
      const look = new LookGenerator(rig).generate(STYLES[id], 'drop', PANEL_DEFAULT);
      expect(JSON.stringify(look)).toBe(JSON.stringify(expected.look));
      vi.restoreAllMocks();
    }
  });

  it('keeps the extra sec field on the generated look (quirk E7) and the style data of the original', () => {
    const look = new LookGenerator(rig, rng(1)).generate(STYLES.edm, 'intro', QUIET);
    expect(Object.keys(look)).toEqual(['num', 'name', 'fade', 'vals', 'fx', 'sec']);
    expect(look.name).toBe('EDM / Festival · Intro');
    expect(look.sec).toBe('intro');
    expect(Object.keys(STYLES)).toEqual(Object.keys(LEGACY_STYLES));
    for (const id of STYLE_IDS) {
      expect({ ...STYLES[id], he: he.autoStyleTaglines[id] }).toStrictEqual(LEGACY_STYLES[id]);
    }
  });
});
