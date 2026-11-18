/**
 * Owns G10 at the preset pool: `PresetLibrary.isAvailable` follows the current stage, the preset data stays, and
 * applying an unavailable computed preset logs the missing part and changes nothing. Which preset needs which part is
 * owned by `presetTargets.test.ts`; how a preset applies on the built-in stage by the programmer parity tests.
 */
import { describe, expect, it } from 'vitest';
import { EventBus, type Clock } from '../../../../src/core';
import { createTemplate } from '../../../../src/domain/stage/templates';
import { AppState } from '../../../../src/engine/AppState';
import type { EngineEvents } from '../../../../src/engine/events';
import { ExecutorPool } from '../../../../src/engine/ExecutorPool';
import { PresetLibrary } from '../../../../src/engine/PresetLibrary';
import type { PresetPools, PresetType } from '../../../../src/engine/presetTypes';
import { Programmer } from '../../../../src/engine/Programmer';
import { Selection } from '../../../../src/engine/Selection';
import { StageService } from '../../../../src/engine/stage/StageService';
import { recordEvents } from '../../../shared';

const clock: Clock = { nowMs: () => 0, nowSeconds: () => 0 };
const pools = (): PresetPools => ({
  1: {},
  2: { 5: { name: 'Cone', kind: 'fn', fn: 'ringCone' }, 6: { name: 'Home', kind: 'fn', fn: 'home' } },
  3: { 1: { name: 'Red', kind: 'global', vals: { r: 255 } } },
  4: {},
  5: {},
});

/** [pool, slot]: the ring preset, the deck preset, an empty slot and a colour preset. */
const SLOTS: readonly (readonly [PresetType, number])[] = [
  [2, 5],
  [2, 6],
  [2, 7],
  [3, 1],
];

const setup = () => {
  const bus = new EventBus<EngineEvents>();
  const service = new StageService(bus, { builtIn: createTemplate('sultans-pool'), tooManyFixtures: String });
  const rig = service.rig;
  const presets = new PresetLibrary(bus, service);
  presets.replace(pools());
  const selection = new Selection(rig, bus);
  const state = new AppState(bus);
  const pool = new ExecutorPool(clock, bus);
  const programmer = new Programmer({ rig, selection, presets, pool, state, clock, bus, source: service });
  selection.set([201, 202]);
  return { service, presets, programmer, logs: recordEvents(bus) };
};

describe('preset availability (G10)', () => {
  it('follows the stage: a ring preset is unavailable without a ring, the others stay, the data is kept', () => {
    const { service, presets } = setup();
    const available = (): boolean[] => SLOTS.map(([t, s]) => presets.isAvailable(t, s));
    const missing = () => SLOTS.map(([t, s]) => presets.missingTarget(t, s));
    const before = [available(), missing()];
    service.apply(createTemplate('empty'), 'builder');
    expect([before, [available(), missing()], presets.all]).toEqual([
      [
        [true, true, true, true],
        [null, null, null, null],
      ],
      [
        [false, true, true, true],
        ['ring', null, null, null],
      ],
      pools(),
    ]);
  });

  it('makes every preset available without a RigSource', () => {
    const library = new PresetLibrary(new EventBus<EngineEvents>());
    library.replace(pools());
    expect(library.isAvailable(2, 5)).toBe(true);
  });

  it('applies the preset on a stage with a ring, and on one without logs the part and changes nothing', () => {
    const { service, programmer, logs } = setup();
    programmer.applyPreset(2, 5);
    const applied = Object.keys(programmer.vals);
    programmer.vals = {};
    service.apply(createTemplate('empty'), 'builder');
    logs.length = 0;
    programmer.applyPreset(2, 5);
    expect([applied, programmer.vals, logs]).toEqual([
      ['201', '202'],
      {},
      ['log:er:Preset 2.5 needs a ring on this stage'],
    ]);
  });
});
