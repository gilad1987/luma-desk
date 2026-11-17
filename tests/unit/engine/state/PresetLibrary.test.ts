import { describe, expect, it } from 'vitest';
import { EventBus, rng } from '../../../../src/core';
import { ATTR, type AttrName, type AttrValues } from '../../../../src/domain/attributes';
import type { EngineEvents } from '../../../../src/engine/events';
import { PresetLibrary } from '../../../../src/engine/PresetLibrary';
import type { PresetPools, PresetType } from '../../../../src/engine/presetTypes';
import { storePresetOracle } from './oracle/storeOracle';
import { recordEvents } from '../../../shared';

const ATTRS = Object.keys(ATTR) as AttrName[];
const IDS = [101, 102, 103, 201, 202, 301];

const setup = () => {
  const bus = new EventBus<EngineEvents>();
  return { library: new PresetLibrary(bus), events: recordEvents(bus) };
};

/** Random programmer values: a few fixtures, a few attributes each, sometimes a key holding undefined. */
function randomProgrammer(random: () => number): Record<number, AttrValues> {
  const vals: Record<number, AttrValues> = {};
  for (const id of IDS) {
    if (random() < 0.4) continue;
    const v: AttrValues = {};
    for (const a of ATTRS) if (random() < 0.25) v[a] = random() < 0.1 ? undefined : Math.round(random() * 100);
    vals[id] = v;
  }
  return vals;
}

describe('PresetLibrary', () => {
  it('starts with five empty pools and replace swaps the live object', () => {
    const { library, events } = setup();
    expect(library.all).toEqual({ 1: {}, 2: {}, 3: {}, 4: {}, 5: {} });
    const pools: PresetPools = {
      1: {},
      2: {},
      3: {},
      4: { 1: { name: 'Red', kind: 'global', vals: { r: 100 } } },
      5: {},
    };
    library.replace(pools);
    expect(library.all).toBe(pools);
    expect(events).toEqual([]);
  });

  it('storeFromProgrammer matches the original storePreset (pools and events) over 400 random stores', () => {
    const random = rng(5);
    const { library, events } = setup();
    const oracle = structuredClone(library.all);
    const calls: string[] = [];
    // a non-recorded preset in a slot: storing over it must take the default name
    library.all[4][2] = { name: 'Kept?', kind: 'global', vals: { r: 1 } };
    oracle[4][2] = { name: 'Kept?', kind: 'global', vals: { r: 1 } };
    for (let run = 0; run < 400; run++) {
      const type = (1 + Math.floor(random() * 5)) as PresetType;
      const slot = 1 + Math.floor(random() * 4);
      const sel = IDS.filter(() => random() < 0.6);
      const vals = randomProgrammer(random);
      if (random() < 0.1) {
        const pr = library.all[type][slot];
        const old = oracle[type][slot];
        if (pr && old) pr.name = old.name = `Renamed ${run}`;
      }
      library.storeFromProgrammer(type, slot, sel, vals);
      storePresetOracle(oracle, sel, vals, type, slot, calls);
    }
    expect(JSON.stringify(library.all)).toBe(JSON.stringify(oracle));
    expect(events).toEqual(calls);
  });

  it('records only the pool features, in selection order, and announces log, repaint, save', () => {
    const { library, events } = setup();
    library.storeFromProgrammer(4, 3, [102, 101], { 101: { r: 10, dim: 50 }, 102: { g: 0, b: 5, pan: 1 } });
    expect(library.all[4][3]).toEqual({ name: 'Color 3', kind: 'fix', fix: { 101: { r: 10 }, 102: { g: 0, b: 5 } } });
    expect(events).toEqual(['log:ok:Stored Preset 4.3', 'poolsChanged', 'showChanged']);
  });

  it('stores nothing and reports the error when no selected fixture has a value of the pool', () => {
    const { library, events } = setup();
    library.storeFromProgrammer(2, 1, [101], { 101: { dim: 100 }, 102: { pan: 10 } });
    expect(library.all[2]).toEqual({});
    expect(events).toEqual(['log:er:Store Preset: no Position values in programmer for selection']);
  });
});
