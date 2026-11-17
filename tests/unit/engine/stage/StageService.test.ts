import { describe, expect, it } from 'vitest';
import { EventBus } from '../../../../src/core';
import type { StageDesign } from '../../../../src/domain/stage/StageDesign';
import { createTemplate } from '../../../../src/domain/stage/templates';
import type { EngineEvents } from '../../../../src/engine/events';
import type { RigChangeCause } from '../../../../src/engine/stage/rigChanged';
import { StageService } from '../../../../src/engine/stage/StageService';
import { recordEvents } from '../state/recordEvents';

const builtIn = createTemplate('sultans-pool');
const options = { tooManyFixtures: (n: number): string => `too many: ${n}` };

const setup = (initial?: StageDesign) => {
  const bus = new EventBus<EngineEvents>();
  const events = recordEvents(bus);
  return { bus, events, service: new StageService(bus, builtIn, initial, options) };
};

/** A design with `n` fixtures, copies of the theatre's first fixture under fresh ids. */
function designWith(n: number): StageDesign {
  const theatre = createTemplate('theatre');
  const [first] = theatre.fixtures;
  if (first === undefined) throw new Error('theatre has no fixtures');
  return { ...theatre, fixtures: Array.from({ length: n }, (_, i) => ({ ...first, id: 10000 + i })) };
}

describe('StageService', () => {
  it('derives the first rig in the constructor with no event and cause boot', () => {
    const { events, service } = setup();
    expect(events).toEqual([]);
    expect(service.cause).toBe('boot');
    expect(service.design).toBe(builtIn);
    expect(service.isBuiltIn).toBe(true);
    expect(service.rig.fixtures).toHaveLength(builtIn.fixtures.length);
    expect(service.frame.ring).not.toBeNull();
  });

  it('starts from a saved stage when one is given', () => {
    const theatre = createTemplate('theatre');
    const { events, service } = setup(theatre);
    expect(events).toEqual([]);
    expect(service.design).toBe(theatre);
    expect(service.isBuiltIn).toBe(false);
    expect(service.rig.fixtures).toHaveLength(theatre.fixtures.length);
  });

  it('emits one rigChanged per apply with only the design, after rig, frame and cause are set', () => {
    const { bus, service } = setup();
    const empty = createTemplate('empty');
    const seen: unknown[] = [];
    bus.on('rigChanged', (payload) => {
      seen.push({
        keys: Object.keys(payload),
        design: payload.design === empty && service.design === empty,
        rig: service.rig.fixtures.length,
        ring: service.frame.ring,
        cause: service.cause,
      });
    });
    service.apply(empty, 'builder');
    expect(seen).toEqual([{ keys: ['design'], design: true, rig: 0, ring: null, cause: 'builder' }]);
  });

  it.each<[Exclude<RigChangeCause, 'boot'>, string[]]>([
    ['builder', ['rigChanged:theatre', 'showChanged']],
    ['import', ['rigChanged:theatre', 'showChanged']],
    ['preview', ['rigChanged:theatre']],
    ['showLoad', ['rigChanged:theatre']],
  ])('apply with cause %s emits %j', (cause, expected) => {
    const { events, service } = setup();
    service.apply(createTemplate('theatre'), cause);
    expect(events).toEqual(expected);
  });

  it('tracks the built-in design by identity, not by equal content', () => {
    const { service } = setup();
    service.apply(createTemplate('sultans-pool'), 'builder');
    expect(service.isBuiltIn).toBe(false);
    service.apply(builtIn, 'builder');
    expect(service.isBuiltIn).toBe(true);
  });

  it('toasts once above the soft limit, after rigChanged and showChanged', () => {
    const { events, service } = setup();
    service.apply(designWith(501), 'builder');
    expect(events).toEqual(['rigChanged:theatre', 'showChanged', 'toast:too many: 501']);
  });

  it('does not toast at the limit itself or for a preview above it', () => {
    const { events, service } = setup();
    service.apply(designWith(500), 'builder');
    service.apply(designWith(600), 'preview');
    expect(events.filter((e) => e.startsWith('toast:'))).toEqual([]);
  });
});
