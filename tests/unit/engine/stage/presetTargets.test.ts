/**
 * Owns which presets the pool offers on the built-in stage (all, for parity), the empty stage and a stage without
 * the band. That `PRESET_TARGETS` names every preset is checked by tsc (a `Record` over `PresetFnName`); the festival
 * and theatre stages are in `qa/presetTargets.frames.test.ts`.
 */
import { describe, expect, it } from 'vitest';
import { frameOf } from '../../../../src/domain/stage/StageFrame';
import { createTemplate } from '../../../../src/domain/stage/templates';
import { PRESET_FNS, type PresetFnName } from '../../../../src/engine/presetFunctions';
import { isPresetAvailable } from '../../../../src/engine/stage/presetTargets';

const names = Object.keys(PRESET_FNS) as PresetFnName[];
const available = (frame: ReturnType<typeof frameOf>): PresetFnName[] =>
  names.filter((name) => isPresetAvailable(name, frame));

describe('presetTargets', () => {
  it('makes every preset available on the built-in stage (parity)', () => {
    expect(available(frameOf(createTemplate('sultans-pool')))).toEqual(names);
  });

  it('hides the ring, screen and band presets on the empty stage', () => {
    const hidden = names.filter((name) => !isPresetAvailable(name, frameOf(createTemplate('empty'))));
    expect(hidden.sort()).toEqual(['band', 'drums', 'orch', 'ringCone', 'ringCrown', 'ringSun', 'ringTwist', 'screen']);
  });

  it('hides only the band presets when the band scenery is off', () => {
    const design = createTemplate('sultans-pool');
    const frame = frameOf({ ...design, scenery: { ...design.scenery, band: false } });
    const hidden = names.filter((name) => !isPresetAvailable(name, frame));
    expect(hidden.sort()).toEqual(['band', 'drums', 'orch']);
  });
});
