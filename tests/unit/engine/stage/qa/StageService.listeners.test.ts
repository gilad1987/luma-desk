/**
 * QA4: what `rigChanged` listeners see when one of them re-enters `apply` or throws. Delivery order and error
 * propagation are the EventBus contract (`tests/unit/core`); this file owns only the StageService state around them.
 */
import { describe, expect, it } from 'vitest';
import { EventBus } from '../../../../../src/core';
import { createTemplate } from '../../../../../src/domain/stage/templates';
import type { EngineEvents } from '../../../../../src/engine/events';
import { StageService } from '../../../../../src/engine/stage/StageService';
import { recordEvents } from '../../state/recordEvents';

const builtIn = createTemplate('sultans-pool');

const setup = () => {
  const bus = new EventBus<EngineEvents>();
  const service = new StageService(bus, builtIn, undefined, { tooManyFixtures: String });
  return { bus, service };
};

/** A first listener turns the theatre into the festival; a later listener logs payload and source names per call. */
const reenter = () => {
  const { bus, service } = setup();
  const theatre = createTemplate('theatre');
  const festival = createTemplate('festival');
  bus.on('rigChanged', ({ design }) => {
    if (design === theatre) service.apply(festival, 'builder');
  });
  const seen: string[] = [];
  bus.on('rigChanged', ({ design }) => seen.push(`${design.source.name}/${service.design.source.name}`));
  const events = recordEvents(bus);
  service.apply(theatre, 'builder');
  return { service, seen, events, theatre, festival };
};

describe('StageService listeners (QA4)', () => {
  it('leaves the inner design in place after a listener re-enters apply', () => {
    const { service, festival, events } = reenter();
    expect([service.design, service.rig.fixtures.length]).toEqual([festival, festival.fixtures.length]);
    expect(events.filter((e) => e === 'showChanged')).toHaveLength(2);
  });

  it('delivers the outer, stale payload last to a later listener after a re-entrant apply (open bug, QA4)', () => {
    const { seen, theatre, festival } = reenter();
    const [t, f] = [theatre.source.name, festival.source.name];
    expect(seen).toEqual([`${f}/${f}`, `${t}/${f}`]);
  });

  // QA4 finding: the class doc promises "every rigChanged listener sees one consistent state"; a re-entrant apply
  // breaks it, as the later listener's last payload is the theatre while the source is the festival.
  it.fails('gives every listener a payload equal to the source design, also under re-entry', () => {
    const { seen } = reenter();
    expect(seen.every((line) => line.split('/')[0] === line.split('/')[1])).toBe(true);
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
