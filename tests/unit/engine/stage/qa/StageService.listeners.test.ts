/**
 * QA4: what happens when a `rigChanged` listener re-enters `apply` (refused with an error) or throws. Delivery order
 * and error propagation are the EventBus contract (`tests/unit/core`); this file owns only the StageService state.
 */
import { describe, expect, it } from 'vitest';
import { EventBus } from '../../../../../src/core';
import { createTemplate } from '../../../../../src/domain/stage/templates';
import type { EngineEvents } from '../../../../../src/engine/events';
import { StageService } from '../../../../../src/engine/stage/StageService';
import { recordEvents } from '../../../../shared';

const builtIn = createTemplate('sultans-pool');

const setup = () => {
  const bus = new EventBus<EngineEvents>();
  const service = new StageService(bus, { builtIn, tooManyFixtures: String });
  return { bus, service };
};

describe('StageService listeners (QA4)', () => {
  it('refuses an apply from a rigChanged listener and keeps the outer design for every listener', () => {
    const { bus, service } = setup();
    const [theatre, festival] = [createTemplate('theatre'), createTemplate('festival')];
    bus.on('rigChanged', ({ design }) => {
      if (design === theatre) service.apply(festival, 'builder');
    });
    const events = recordEvents(bus);
    expect(() => service.apply(theatre, 'builder')).toThrow(
      'StageService.apply: a listener re-entered with builder while the builder apply emits',
    );
    expect([service.design, service.rig.fixtures.length, service.cause, events]).toEqual([
      theatre,
      theatre.fixtures.length,
      'builder',
      [],
    ]);
  });

  it('keeps rig, design, frame and cause together when a listener throws, and the error reaches the caller', () => {
    const { bus, service } = setup();
    const theatre = createTemplate('theatre');
    bus.on('rigChanged', () => {
      throw new Error('listener failed');
    });
    const events = recordEvents(bus);
    expect(() => service.apply(theatre, 'builder')).toThrow('listener failed');
    const state = [service.design, service.rig.fixtures.length, service.frame.ring, service.cause, service.isBuiltIn];
    expect(state).toEqual([theatre, theatre.fixtures.length, null, 'builder', false]);
    expect(events).toEqual([]);
  });

  it('works again on the next apply after a listener threw once', () => {
    const { bus, service } = setup();
    let fail = true;
    bus.on('rigChanged', () => {
      if (fail) throw new Error('once');
    });
    const events = recordEvents(bus);
    expect(() => service.apply(createTemplate('theatre'), 'builder')).toThrow('once');
    fail = false;
    service.apply(builtIn, 'showLoad');
    expect([service.isBuiltIn, service.cause, events]).toEqual([
      true,
      'showLoad',
      [`rigChanged:${builtIn.source.name}`],
    ]);
  });
});
