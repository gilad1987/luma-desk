/**
 * QA5: after `apply` refuses a re-entrant call it must clear its emitting flag, or every later apply throws and the
 * desk can never change its rig again. Catches a flag that is not reset in `finally`. The refusal message and the
 * state at the moment of refusal are owned by StageService.listeners.test.ts.
 */
import { describe, expect, it } from 'vitest';
import { EventBus } from '../../../../../src/core';
import { createTemplate } from '../../../../../src/domain/stage/templates';
import type { EngineEvents } from '../../../../../src/engine/events';
import { StageService } from '../../../../../src/engine/stage/StageService';
import { recordEvents } from '../../../../shared';

const builtIn = createTemplate('sultans-pool');

describe('StageService after a refused re-entry (QA5)', () => {
  it('applies the next design and emits once, with showChanged, after a listener re-entered', () => {
    const bus = new EventBus<EngineEvents>();
    const service = new StageService(bus, { builtIn, tooManyFixtures: String });
    const [theatre, festival] = [createTemplate('theatre'), createTemplate('festival')];
    let isReentering = true;
    bus.on('rigChanged', () => {
      if (isReentering) service.apply(festival, 'preview');
    });
    expect(() => service.apply(theatre, 'builder')).toThrow('re-entered with preview while the builder apply emits');
    isReentering = false;
    const events = recordEvents(bus);
    service.apply(festival, 'import');
    expect([service.design, service.rig.fixtures.length, service.cause, events]).toEqual([
      festival,
      festival.fixtures.length,
      'import',
      ['rigChanged:festival', 'showChanged'],
    ]);
  });

  it('refuses again on a second re-entry, so the guard holds every time and not only once', () => {
    const bus = new EventBus<EngineEvents>();
    const service = new StageService(bus, { builtIn, tooManyFixtures: String });
    bus.on('rigChanged', ({ design }) => {
      if (design !== builtIn) service.apply(builtIn, 'showLoad');
    });
    const theatre = createTemplate('theatre');
    expect(() => service.apply(theatre, 'builder')).toThrow('StageService.apply');
    expect(() => service.apply(theatre, 'builder')).toThrow('StageService.apply');
    service.apply(builtIn, 'showLoad');
    expect([service.isBuiltIn, service.cause]).toEqual([true, 'showLoad']);
  });
});
