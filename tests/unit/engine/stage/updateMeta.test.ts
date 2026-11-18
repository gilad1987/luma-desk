/**
 * Owns `StageService.updateMeta` (G8): it swaps a design that differs only in MVR `hiddenLayers`, emits only
 * `showChanged`, keeps the rig object, refuses rig changes and designs without MVR data. Re-entry is in
 * `updateMeta.reentry.test.ts`.
 */
import { describe, expect, it } from 'vitest';
import { EventBus } from '../../../../src/core';
import type { StageDesign } from '../../../../src/domain/stage/StageDesign';
import { createTemplate } from '../../../../src/domain/stage/templates';
import type { EngineEvents } from '../../../../src/engine/events';
import { StageService } from '../../../../src/engine/stage/StageService';
import { recordEvents } from '../../../shared';

const builtIn = createTemplate('sultans-pool');
const layers = [{ uuid: 'a', name: 'Truss' }];
const imported: StageDesign = {
  ...createTemplate('theatre'),
  mvr: { fixtures: {}, layers, hiddenLayers: [], offset: [0, 0, 0] },
};
const withHidden = (design: StageDesign, hiddenLayers: readonly string[]): StageDesign =>
  design.mvr ? { ...design, mvr: { ...design.mvr, hiddenLayers } } : design;

const setup = () => {
  const bus = new EventBus<EngineEvents>();
  const service = new StageService(bus, { builtIn, initial: imported, tooManyFixtures: String });
  return { bus, service, events: recordEvents(bus) };
};

describe('StageService.updateMeta', () => {
  it('replaces the design, keeps the rig and emits only showChanged', () => {
    const { service, events } = setup();
    const rig = service.rig;
    const frame = service.frame;
    const hidden = withHidden(imported, ['a']);
    service.updateMeta(hidden);
    expect(service.design).toBe(hidden);
    expect(service.rig).toBe(rig);
    expect(service.frame).toBe(frame);
    expect(service.cause).toBe('boot');
    expect(events).toEqual(['showChanged']);
  });

  it('refuses a design that changes rig data and keeps the old design', () => {
    const { service, events } = setup();
    const moved = { ...imported, fixtures: imported.fixtures.slice(1) };
    expect(() => service.updateMeta(moved)).toThrow(/use apply/);
    expect(() => service.updateMeta(createTemplate('theatre'))).toThrow(/use apply/);
    expect(service.design).toBe(imported);
    expect(events).toEqual([]);
  });

  it('refuses a design without MVR data, even when its rig is the same', () => {
    const theatre = createTemplate('theatre');
    const service = new StageService(new EventBus<EngineEvents>(), {
      builtIn,
      initial: theatre,
      tooManyFixtures: String,
    });
    expect(() => service.updateMeta({ ...theatre })).toThrow('StageService.updateMeta: the design has no MVR data');
    expect(service.design).toBe(theatre);
  });
});
