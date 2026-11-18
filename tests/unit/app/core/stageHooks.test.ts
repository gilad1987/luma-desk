import { describe, expect, it } from 'vitest';
import { createStageHooks } from '../../../../src/app/testHook/stageHooks';
import { EventBus } from '../../../../src/core';
import { createTemplate } from '../../../../src/domain/stage/templates';
import { BUILT_IN_DESIGN } from '../../../../src/domain/stage/templates/sultansPool/builtInDesign';
import type { EngineEvents } from '../../../../src/engine/events';
import { StageService } from '../../../../src/engine/stage/StageService';

/** The hooks over a real stage service on the built-in design, and every rig change cause it announced. */
function setup() {
  const bus = new EventBus<EngineEvents>();
  const stage = new StageService(bus, { builtIn: BUILT_IN_DESIGN, tooManyFixtures: () => '' });
  const causes: string[] = [];
  bus.on('rigChanged', () => causes.push(stage.cause));
  return { stage, causes, hooks: createStageHooks(stage) };
}

describe('createStageHooks', () => {
  it('reports the built-in stage at boot', () => {
    const { hooks } = setup();
    const { source, venue } = BUILT_IN_DESIGN;
    expect(hooks.stage()).toEqual({ count: 405, source: source.kind, venue: venue.kind });
  });

  it('applies a template as the builder does and reads the new stage at the next call', () => {
    const { hooks, causes } = setup();
    hooks.applyTemplate('theatre');
    const { source, venue } = createTemplate('theatre');
    expect(hooks.stage()).toEqual({ count: 30, source: source.kind, venue: venue.kind });
    expect(causes).toEqual(['builder']);
  });

  it('goes back to the built-in design object itself, so the stage counts as built-in again', () => {
    const { hooks, stage } = setup();
    hooks.applyTemplate('empty');
    expect([hooks.stage().count, stage.isBuiltIn]).toEqual([0, false]);
    hooks.applyTemplate('built-in');
    expect([hooks.stage().count, stage.isBuiltIn, stage.design]).toEqual([405, true, BUILT_IN_DESIGN]);
  });

  it('rejects an unknown template id and leaves the stage as it was', () => {
    const { hooks, causes } = setup();
    expect(() => hooks.applyTemplate('nope')).toThrow('unknown template: nope');
    expect([hooks.stage().count, causes]).toEqual([405, []]);
  });
});
