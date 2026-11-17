import type { StageDesign } from '../../../src/domain/stage/StageDesign';
import { createTemplate } from '../../../src/domain/stage/templates';
import type { EngineMessage } from '../../../src/engine/events';
import { StageService } from '../../../src/engine/stage/StageService';
import { DemoShow, ShowSerializer } from '../../../src/show';
import type { StageFieldDeps } from '../../../src/show/stageField';
import { showWorld } from './showWorld';

/** The built-in design of every stage world; `isBuiltIn` compares with this object by identity. */
export const BUILT_IN = createTemplate('sultans-pool');

/** The injected bad-stage toast text. */
export const BAD_STAGE = 'bad stage';

/**
 * The show world with a real `StageService` wired the way main.ts will wire it: the serializer gets the stage deps and
 * reads the rig through a getter, and the toast goes through the bus `message` event.
 */
export function stageWorld(initial?: StageDesign) {
  const world = showWorld();
  const { bus, groups, presets, execs, tempo, state, programmer, selection } = world;
  const messages: EngineMessage[] = [];
  const designs: StageDesign[] = [];
  bus.on('message', (m) => messages.push(m));
  bus.on('rigChanged', (e) => designs.push(e.design));
  const service = new StageService(bus, { builtIn: BUILT_IN, initial, tooManyFixtures: (n) => `${n}` });
  const stage: StageFieldDeps = {
    service,
    builtIn: BUILT_IN,
    badStage: BAD_STAGE,
    toast: (m) => bus.emit('message', m),
  };
  const serializer = new ShowSerializer({
    get rig() {
      return service.rig;
    },
    groups,
    presets,
    execs,
    tempo,
    state,
    programmer,
    selection,
    stage,
  });
  const demo = new DemoShow({ rig: service.rig, serializer, execs, state, bus });
  const json = (): string => JSON.stringify(serializer.serialize());
  return { ...world, service, serializer, demo, json, messages, designs };
}
