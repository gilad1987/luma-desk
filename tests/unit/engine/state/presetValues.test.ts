import { describe, expect, it } from 'vitest';
import { buildRig } from '../../../../src/domain/rig';
import { defaultPresets } from '../../../../src/engine/defaultPresets';
import { presetValues } from '../../../../src/engine/presetValues';
import type { Preset } from '../../../../src/engine/presetTypes';
import { presetValsOracle } from './oracle/storeOracle';

const rig = buildRig();

const fixture = (id: number) => {
  const f = rig.get(id);
  if (!f) throw new Error(`fixture ${id} missing`);
  return f;
};

describe('presetValues', () => {
  it('matches the original presetVals for every default preset, fixture and a fan of 24', () => {
    const pools = defaultPresets();
    for (const pool of Object.values(pools))
      for (const preset of Object.values(pool))
        rig.fixtures.forEach((f, k) => {
          expect(presetValues(preset, f, k % 24, 24)).toEqual(presetValsOracle(preset, f, k % 24, 24));
        });
  });

  it('returns the global preset object itself, not a copy', () => {
    const preset: Preset = { name: 'Full', kind: 'global', vals: { dim: 100 } };
    expect(presetValues(preset, fixture(101), 0, 1)).toBe(preset.vals);
  });

  it('returns the recorded values of the fixture, or undefined when the preset has none for it', () => {
    const preset: Preset = { name: 'Color 1', kind: 'fix', fix: { 101: { r: 5 } } };
    expect(presetValues(preset, fixture(101), 0, 2)).toBe(preset.fix[101]);
    expect(presetValues(preset, fixture(102), 1, 2)).toBeUndefined();
  });

  it('applies nothing for a hand-edited recorded preset without fix, as the original did', () => {
    const broken = JSON.parse('{"name":"x","kind":"fix"}') as Preset;
    expect(presetValues(broken, fixture(101), 0, 1)).toBe(presetValsOracle(broken, fixture(101), 0, 1));
    expect(presetValues(broken, fixture(101), 0, 1)).toBeUndefined();
  });
});
