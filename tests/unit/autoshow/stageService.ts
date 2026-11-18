import { EventBus } from '../../../src/core';
import { createTemplate, type TemplateId } from '../../../src/domain/stage/templates';
import type { EngineEvents } from '../../../src/engine/events';
import { StageService } from '../../../src/engine/stage/StageService';

/** A real stage service on the built-in design, started on template `id` when one is given. */
export function stageService(id?: TemplateId): StageService {
  const bus = new EventBus<EngineEvents>();
  const initial = id === undefined ? undefined : createTemplate(id);
  return new StageService(bus, { builtIn: createTemplate('sultans-pool'), initial, tooManyFixtures: (n) => `${n}` });
}
