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
  const events = recordEvents(bus);
  // a committed apply also marks the show edited; that is the StageService's, not the selection's
  const selectionEvents = (): string[] => events.filter((e) => e !== 'showChanged');
  return { service, selection, events, selectionEvents };
};

describe('Selection with a RigSource', () => {
  it.each(['builder', 'showLoad', 'import'] as const)('drops the ids the new rig lacks on a %s apply', (cause) => {
    const { service, selection, events, selectionEvents } = setup();
    selection.set([101, 102]);
    events.length = 0;
    service.apply(createTemplate('empty'), cause);
    expect([selection.ids, selection.has(101), selectionEvents()]).toEqual([
      [],
      false,
      ['selectionChanged', 'rigChanged:empty'],
    ]);
  });

  it('keeps the selection over a preview, so Cancel gives it back, and prunes on Done', () => {
    const { service, selection, events } = setup();
    selection.set([101, 102]);
    events.length = 0;
    service.apply(createTemplate('empty'), 'preview');
    const previewed = [[...selection.ids], selection.has(101), [...events]];
    service.apply(createTemplate('empty'), 'builder');
    expect(previewed).toEqual([[101, 102], true, ['rigChanged:empty']]);
    expect(selection.ids).toEqual([]);
  });

  it('announces nothing on a rig change that keeps every selected fixture', () => {
    const { service, selection, events, selectionEvents } = setup();
    selection.set([101, 102]);
    events.length = 0;
    service.apply(createTemplate('sultans-pool'), 'builder');
    expect([selection.ids, selectionEvents()]).toEqual([[101, 102], ['rigChanged:sultans-pool']]);
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
