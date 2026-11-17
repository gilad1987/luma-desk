/**
 * QA4: the preset target table is exhaustive and correct on the festival and theatre templates. The built-in and
 * empty stages are owned by `../presetTargets.test.ts`; how a frame is read from a design by the domain frame tests.
 */
import { describe, expect, it } from 'vitest';
import { frameOf, type StageFrame } from '../../../../../src/domain/stage/StageFrame';
import { createTemplate } from '../../../../../src/domain/stage/templates';
import { PRESET_FNS, type PresetFnName } from '../../../../../src/engine/presetFunctions';
import { isPresetAvailable, PRESET_TARGETS } from '../../../../../src/engine/stage/presetTargets';

const names = Object.keys(PRESET_FNS) as PresetFnName[];
const hidden = (frame: StageFrame): PresetFnName[] => names.filter((n) => !isPresetAvailable(n, frame)).sort();

describe('presetTargets frames (QA4)', () => {
  it('has one entry per preset function and only known targets', () => {
    expect(Object.keys(PRESET_TARGETS).sort()).toEqual([...names].sort());
    const targets = new Set(Object.values(PRESET_TARGETS));
    expect([...targets].every((t) => t === null || t === 'ring' || t === 'screen' || t === 'band')).toBe(true);
  });

  it('keeps every preset on the festival, which has a ring, a screen and a band', () => {
    expect(hidden(frameOf(createTemplate('festival')))).toEqual([]);
  });

  it('hides the ring and screen presets on the theatre and keeps the band ones', () => {
    expect(hidden(frameOf(createTemplate('theatre')))).toEqual([
      'ringCone',
      'ringCrown',
      'ringSun',
      'ringTwist',
      'screen',
    ]);
  });

  it('decides on the frame alone, so a ring, screen or band added to the theatre frame brings its presets back', () => {
    const theatre = frameOf(createTemplate('theatre'));
    const ring = { ...theatre, ring: { x: 0, y: 9, z: -8, R: 6 } };
    const screen = { ...theatre, screen: { z: -15, x0: -10, x1: 10, y0: 2, y1: 10 } };
    const noBand = { ...theatre, bandPoints: [] };
    expect([hidden(ring), hidden(screen), hidden(noBand)]).toEqual([
      ['screen'],
      ['ringCone', 'ringCrown', 'ringSun', 'ringTwist'],
      ['band', 'drums', 'orch', 'ringCone', 'ringCrown', 'ringSun', 'ringTwist', 'screen'],
    ]);
  });
});
