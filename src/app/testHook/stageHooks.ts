import { createTemplate, TEMPLATE_IDS, type TemplateId } from '../../domain/stage/templates';
import type { StageService } from '../../engine/stage/StageService';

/** What `__desk.stage()` reports: enough for a spec to tell two stages apart without reading the whole design. */
export interface DeskStageInfo {
  readonly count: number;
  readonly source: string;
  readonly venue: string;
}

/** The stage part of `window.__desk`: specs change the stage without the builder UI. */
export interface DeskStageApi {
  stage(): DeskStageInfo;
  /** Applies a template as the builder's Done does, or `'built-in'`: the desk's own stage (the identity design). */
  applyTemplate(id: string): void;
}

const BUILT_IN = 'built-in';

const isTemplateId = (id: string): id is TemplateId => TEMPLATE_IDS.some((known) => known === id);

/** Builds the stage hooks over the live service; every call reads the current stage. */
export function createStageHooks(stage: Pick<StageService, 'rig' | 'design' | 'builtIn' | 'apply'>): DeskStageApi {
  return {
    stage: () => ({
      count: stage.rig.fixtures.length,
      source: stage.design.source.kind,
      venue: stage.design.venue.kind,
    }),
    applyTemplate: (id) => {
      if (id === BUILT_IN) return stage.apply(stage.builtIn, 'builder');
      if (!isTemplateId(id)) throw new Error(`unknown template: ${id}`);
      stage.apply(createTemplate(id), 'builder');
    },
  };
}
