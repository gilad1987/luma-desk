import { describe, expect, it } from 'vitest';
import { EventBus, rng } from '../../../../src/core';
import type { EngineEvents } from '../../../../src/engine/events';
import { GroupLibrary, type GroupPool } from '../../../../src/engine/GroupLibrary';
import { storeGroupOracle } from './oracle/groupStoreOracle';
import { recordEvents } from './recordEvents';

const setup = () => {
  const bus = new EventBus<EngineEvents>();
  return { library: new GroupLibrary(bus), events: recordEvents(bus) };
};

describe('GroupLibrary', () => {
  it('starts empty and replace swaps the live pool object', () => {
    const { library, events } = setup();
    expect(library.all).toEqual({});
    const pool: GroupPool = { 3: { name: 'Three', ids: [101] } };
    library.replace(pool);
    expect(library.all).toBe(pool);
    expect(events).toEqual([]);
  });

  it('store matches the original storeGroup (pool and events) over 300 random stores', () => {
    const random = rng(11);
    const { library, events } = setup();
    const oracle: GroupPool = {};
    const calls: string[] = [];
    for (let run = 0; run < 300; run++) {
      const slot = 1 + Math.floor(random() * 12);
      const ids = Array.from({ length: Math.floor(random() * 4) }, () => 101 + Math.floor(random() * 20));
      if (random() < 0.1) {
        // the Label command renames in place; a later store must keep the new name
        const group = library.all[slot];
        const old = oracle[slot];
        if (group && old) group.name = old.name = `Renamed ${run}`;
      }
      library.store(slot, ids);
      storeGroupOracle(oracle, ids, slot, calls);
    }
    expect(JSON.stringify(library.all)).toBe(JSON.stringify(oracle));
    expect(events).toEqual(calls);
  });

  it('copies the ids, so a later selection change does not alter the stored group', () => {
    const { library } = setup();
    const sel = [101, 102];
    library.store(1, sel);
    sel.push(103);
    expect(library.all[1]).toEqual({ name: 'Group 1', ids: [101, 102] });
  });

  it('an empty selection stores nothing and reports the error only', () => {
    const { library, events } = setup();
    library.store(4, []);
    expect(library.all).toEqual({});
    expect(events).toEqual(['log:er:Store Group: nothing selected']);
  });

  it('logs, then repaints the pools, then saves', () => {
    const { library, events } = setup();
    library.store(2, [101]);
    expect(events).toEqual(['log:ok:Stored Group 2', 'poolsChanged', 'showChanged']);
  });
});
