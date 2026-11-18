/**
 * QA4: StageService over sequences of applies (same design twice, preview then builder, a saved initial stage) and the
 * soft-limit toast at exactly 500 and 501 fixtures for each cause. The single-apply contract is owned by
 * `../StageService.test.ts`; re-entrant and throwing listeners by `StageService.listeners.test.ts`.
 */
import { describe, expect, it } from 'vitest';
import { EventBus } from '../../../../../src/core';
import type { StageDesign } from '../../../../../src/domain/stage/StageDesign';
import { createTemplate } from '../../../../../src/domain/stage/templates';
import type { EngineEvents } from '../../../../../src/engine/events';
import { StageService } from '../../../../../src/engine/stage/StageService';
import { recordEvents } from '../../../../shared';

const builtIn = createTemplate('sultans-pool');

const setup = (initial?: StageDesign) => {
  const bus = new EventBus<EngineEvents>();
  const events = recordEvents(bus);
  const service = new StageService(bus, { builtIn, initial, tooManyFixtures: (n) => `too many: ${n}` });
  return { events, service };
};

/** A design with `n` fixtures, copies of the theatre's first fixture under fresh ids. */
function designWith(n: number): StageDesign {
  const theatre = createTemplate('theatre');
  const [first] = theatre.fixtures;
  if (first === undefined) throw new Error('theatre has no fixtures');
  return { ...theatre, fixtures: Array.from({ length: n }, (_, i) => ({ ...first, id: 20000 + i })) };
}

describe('StageService sequences (QA4)', () => {
  it('announces the same design applied twice twice and derives a fresh rig each time', () => {
    const { events, service } = setup();
    const theatre = createTemplate('theatre');
    service.apply(theatre, 'builder');
    const firstRig = service.rig;
    service.apply(theatre, 'builder');
    const name = theatre.source.name;
    expect(events).toEqual([`rigChanged:${name}`, 'showChanged', `rigChanged:${name}`, 'showChanged']);
    expect([service.rig === firstRig, service.rig.fixtures.length, service.design]).toEqual([false, 30, theatre]);
  });

  it('marks the show changed only for the builder step of a preview-then-builder sequence', () => {
    const { events, service } = setup();
    const theatre = createTemplate('theatre');
    service.apply(theatre, 'preview');
    const afterPreview = [service.cause, service.isBuiltIn, events.length];
    service.apply(theatre, 'builder');
    const name = theatre.source.name;
    expect(afterPreview).toEqual(['preview', false, 1]);
    expect([service.cause, events]).toEqual(['builder', [`rigChanged:${name}`, `rigChanged:${name}`, 'showChanged']]);
  });

  it('counts only the built-in object as built-in, before and after an apply', () => {
    const { service } = setup(createTemplate('theatre'));
    const states = [service.isBuiltIn];
    service.apply(builtIn, 'builder');
    states.push(service.isBuiltIn);
    service.apply({ ...builtIn }, 'builder');
    states.push(service.isBuiltIn);
    service.apply(createTemplate('sultans-pool'), 'builder');
    states.push(service.isBuiltIn, service.design.fixtures.length === builtIn.fixtures.length);
    expect(states).toEqual([false, true, false, false, true]);
  });

  it('uses the initial design for rig and frame with no event, and counts the built-in object given as initial', () => {
    const festival = createTemplate('festival');
    const custom = setup(festival);
    const same = setup(builtIn);
    const copy = setup({ ...builtIn });
    const view = custom.service;
    expect([view.design, view.rig.fixtures.length, view.frame.ring?.R, view.cause, custom.events]).toEqual([
      festival,
      festival.fixtures.length,
      6,
      'boot',
      [],
    ]);
    expect([custom.service.isBuiltIn, same.service.isBuiltIn, copy.service.isBuiltIn]).toEqual([false, true, false]);
  });

  it('toasts at 501 fixtures but not at 500, for every committed cause, and never for a preview', () => {
    const toasts = (n: number, cause: 'builder' | 'import' | 'showLoad' | 'preview'): string[] => {
      const { events, service } = setup();
      service.apply(designWith(n), cause);
      return events.filter((e) => e.startsWith('toast:'));
    };
    expect([toasts(500, 'builder'), toasts(500, 'import'), toasts(500, 'showLoad')]).toEqual([[], [], []]);
    expect([toasts(501, 'builder'), toasts(501, 'import'), toasts(501, 'showLoad'), toasts(501, 'preview')]).toEqual([
      ['toast:too many: 501'],
      ['toast:too many: 501'],
      ['toast:too many: 501'],
      [],
    ]);
  });
});
