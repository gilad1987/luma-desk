/**
 * Owns the selection on a changing rig: with a `RigSource` it checks ids against the current rig and prunes on
 * `rigChanged`. The selection modes and their parity with the original are owned by `Selection.test.ts`, which also
 * proves the constructor without a source behaves as before.
 */
import { describe, expect, it } from 'vitest';
import { EventBus } from '../../../../src/core';
import { createTemplate } from '../../../../src/domain/stage/templates';
import type { EngineEvents } from '../../../../src/engine/events';
import { Selection } from '../../../../src/engine/Selection';
import { StageService } from '../../../../src/engine/stage/StageService';
import { recordEvents } from '../../../shared';

const setup = () => {
  const bus = new EventBus<EngineEvents>();
  const service = new StageService(bus, { builtIn: createTemplate('sultans-pool'), tooManyFixtures: String });
  const selection = new Selection(service.rig, bus, service);
  return { service, selection, events: recordEvents(bus) };
};

describe('Selection with a RigSource', () => {
  it('drops the ids the new rig lacks on a rig change and says so', () => {
    const { service, selection, events } = setup();
    selection.set([101, 102]);
    events.length = 0;
    service.apply(createTemplate('empty'), 'preview');
    expect([selection.ids, selection.has(101), events]).toEqual([[], false, ['selectionChanged', 'rigChanged:empty']]);
  });

  it('announces nothing on a rig change that keeps every selected fixture', () => {
    const { service, selection, events } = setup();
    selection.set([101, 102]);
    events.length = 0;
    service.apply(createTemplate('sultans-pool'), 'preview');
    expect([selection.ids, events]).toEqual([[101, 102], ['rigChanged:sultans-pool']]);
  });

  it('checks new ids against the current rig, not the rig it was built with', () => {
    const { service, selection } = setup();
    const theatre = createTemplate('theatre');
    service.apply(theatre, 'builder');
    const [first, second] = service.rig.fixtures.map((f) => f.id);
    const missing = Math.max(...service.rig.fixtures.map((f) => f.id)) + 1;
    selection.set([missing, second ?? -1, first ?? -1]);
    expect(selection.ids).toEqual([second, first]);
  });
});
