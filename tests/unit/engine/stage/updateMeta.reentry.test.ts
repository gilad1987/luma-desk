/**
 * Owns the re-entry guard of `StageService.updateMeta`: a `rigChanged` listener may not call it during an apply, and a
 * `showChanged` listener may not call `updateMeta` or `apply` while `updateMeta` emits. The error names the refused call.
 */
import { describe, expect, it } from 'vitest';
import { EventBus } from '../../../../src/core';
import type { StageDesign } from '../../../../src/domain/stage/StageDesign';
import { createTemplate } from '../../../../src/domain/stage/templates';
import type { EngineEvents } from '../../../../src/engine/events';
import { StageService } from '../../../../src/engine/stage/StageService';

const imported: StageDesign = {
  ...createTemplate('theatre'),
  mvr: { fixtures: {}, layers: [{ uuid: 'a', name: 'Truss' }], hiddenLayers: [], offset: [0, 0, 0] },
};
const withHidden = (design: StageDesign, hiddenLayers: readonly string[]): StageDesign =>
  design.mvr ? { ...design, mvr: { ...design.mvr, hiddenLayers } } : design;

const setup = () => {
  const bus = new EventBus<EngineEvents>();
  const builtIn = createTemplate('sultans-pool');
  return { bus, service: new StageService(bus, { builtIn, initial: imported, tooManyFixtures: String }) };
};

/** Runs `call` and gives the message of the error it threw, or null. */
function errorOf(call: () => void): string | null {
  try {
    call();
    return null;
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
}

describe('StageService.updateMeta re-entry', () => {
  it('refuses a call from a rigChanged listener before it changes state, and names updateMeta', () => {
    const { bus, service } = setup();
    let error: string | null = null;
    bus.on('rigChanged', ({ design }) => (error = errorOf(() => service.updateMeta(withHidden(design, ['a'])))));
    service.apply(imported, 'builder');
    expect(error).toBe(
      'StageService.updateMeta: a listener re-entered with a hiddenLayers change while the builder apply emits',
    );
    expect(service.design.mvr?.hiddenLayers).toEqual([]);
  });

  it('refuses updateMeta and apply from a showChanged listener while updateMeta emits', () => {
    const { bus, service } = setup();
    const errors: (string | null)[] = [];
    bus.on('showChanged', () => {
      errors.push(errorOf(() => service.updateMeta(withHidden(imported, ['b']))));
      errors.push(errorOf(() => service.apply(imported, 'builder')));
    });
    const hidden = withHidden(imported, ['a']);
    service.updateMeta(hidden);
    expect(errors).toEqual([
      'StageService.updateMeta: a listener re-entered with a hiddenLayers change while the updateMeta emits',
      'StageService.apply: a listener re-entered with builder while the updateMeta emits',
    ]);
    expect(service.design).toBe(hidden);
  });
});
