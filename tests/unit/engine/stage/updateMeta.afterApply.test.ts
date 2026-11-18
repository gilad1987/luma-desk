/**
 * QA of `StageService.updateMeta` after a rig change: once a new import is applied, a layer toggle compares against
 * the new design, not the boot one. The bug it guards: a toggle refused on the new import, or a toggle built from
 * the old design (a stale UI) accepted, which would swap the rig back without `rigChanged`. Plain swaps and refusals
 * are owned by updateMeta.test.ts.
 */
import { describe, expect, it } from 'vitest';
import { EventBus } from '../../../../src/core';
import type { StageDesign } from '../../../../src/domain/stage/StageDesign';
import { createTemplate } from '../../../../src/domain/stage/templates';
import type { EngineEvents } from '../../../../src/engine/events';
import { StageService } from '../../../../src/engine/stage/StageService';
import { recordEvents } from '../../../shared';

const mvr = { fixtures: {}, layers: [{ uuid: 'a', name: 'Truss' }], hiddenLayers: [], offset: [0, 0, 0] } as const;
const bootImport: StageDesign = { ...createTemplate('theatre'), mvr };
const nextImport: StageDesign = { ...createTemplate('festival'), mvr };
const withHidden = (design: StageDesign, hiddenLayers: readonly string[]): StageDesign => ({
  ...design,
  mvr: { ...mvr, hiddenLayers },
});

describe('StageService.updateMeta after apply', () => {
  it('toggles a layer of the newly applied import and keeps its rig', () => {
    const bus = new EventBus<EngineEvents>();
    const service = new StageService(bus, { builtIn: bootImport, initial: bootImport, tooManyFixtures: String });
    const events = recordEvents(bus);
    service.apply(nextImport, 'import');
    const rig = service.rig;
    const hidden = withHidden(nextImport, ['a']);
    service.updateMeta(hidden);
    expect([service.design === hidden, service.rig === rig, service.cause]).toEqual([true, true, 'import']);
    expect(events).toEqual(['rigChanged:festival', 'showChanged', 'showChanged']);
  });

  it('refuses a toggle built from the design before the apply', () => {
    const service = new StageService(new EventBus<EngineEvents>(), {
      builtIn: bootImport,
      initial: bootImport,
      tooManyFixtures: String,
    });
    service.apply(nextImport, 'import');
    expect(() => service.updateMeta(withHidden(bootImport, ['a']))).toThrow(/use apply/);
    expect(service.design).toBe(nextImport);
  });
});
