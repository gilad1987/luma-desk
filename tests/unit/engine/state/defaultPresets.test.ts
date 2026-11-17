import { describe, expect, it } from 'vitest';
import { defaultPresets } from '../../../../src/engine/defaultPresets';
import { COLORS } from '../../../../src/engine/presetColors';
import { PRESET_TYPES, PT_FEAT } from '../../../../src/engine/presetTypes';
import demoShow from '../../../golden/demo-show.json';
import { COLORS_ORACLE, defaultPresetsOracle } from './oracle/presetsOracle';

const json = (value: unknown): string => JSON.stringify(value);

describe('defaultPresets', () => {
  it('serialises exactly like the original defaultPresets, key order included', () => {
    expect(json(defaultPresets())).toBe(json(defaultPresetsOracle()));
  });

  it('agrees with every stored (non-computed) default in the recorded demo show', () => {
    const defaults = defaultPresets();
    const saved: Record<string, Record<string, { kind: string }>> = demoShow.presets;
    for (const [type, pool] of Object.entries(saved))
      for (const [slot, preset] of Object.entries(pool)) {
        if (preset.kind !== 'global') continue;
        expect(json(defaults[Number(type) as keyof typeof defaults][Number(slot)])).toBe(json(preset));
      }
  });

  it('returns fresh pools on each call, so a loaded show cannot change the defaults', () => {
    expect(defaultPresets()[4]).not.toBe(defaultPresets()[4]);
  });

  it('keeps the colour list, pool names and pool features of the original', () => {
    expect(COLORS).toEqual(COLORS_ORACLE);
    expect(PRESET_TYPES).toEqual({ 1: 'Dimmer', 2: 'Position', 3: 'Gobo', 4: 'Color', 5: 'Beam' });
    expect(PT_FEAT).toEqual({ 1: ['dim'], 2: ['pos'], 3: ['gobo'], 4: ['color'], 5: ['beam'] });
  });
});
