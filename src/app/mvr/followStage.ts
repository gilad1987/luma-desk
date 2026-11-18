import type { StageDesign } from '../../domain/stage/StageDesign';
import type { EngineBus } from '../../engine/events';
import type { StageService } from '../../engine/stage/StageService';
import type { MvrFlowDeps } from './MvrFlowDeps';
import { sameMvrFile } from './sameMvrFile';

/** What the stage follower needs: the bus to listen on, the stage to read the cause from, and the MVR parts. */
export interface StageFollowDeps {
  readonly bus: Pick<EngineBus, 'on'>;
  readonly stage: Pick<StageService, 'design' | 'cause'>;
  readonly scenery: Pick<MvrFlowDeps['scenery'], 'dispose' | 'setHiddenLayers'>;
  readonly prompt: Pick<MvrFlowDeps['prompt'], 'hide'>;
  /** Queues `restoreStoredMvr` of `design` in the MVR load queue, so it cannot draw over a later load. */
  readonly restore: (design: StageDesign) => void;
}

/**
 * Makes the MVR scenery and the missing-file prompt follow every stage change: a show load, a template, the builder,
 * Load demo rig. Both belong to one MVR file; a stage without MVR data or of another file drops them, and a stage of
 * another MVR file queues the restore of its stored bytes (which shows the prompt when this browser lacks them). A
 * stage of the same file keeps the scenery but takes its hidden layers, which a show load may change. The MVR
 * import's own apply (cause `import`) is left to the import flow, which draws its scenery itself after the apply.
 * The follower remembers the source it last saw, from the boot stage on, because the scenery may still be loading.
 */
export function followStage({ bus, stage, scenery, prompt, restore }: StageFollowDeps): void {
  let shown = stage.design.source;
  bus.on('rigChanged', ({ design }) => {
    const previous = shown;
    shown = design.source;
    if (stage.cause === 'import') return;
    if (design.mvr && sameMvrFile(previous, design.source)) {
      scenery.setHiddenLayers(design.mvr.hiddenLayers);
      return;
    }
    scenery.dispose();
    prompt.hide();
    if (design.mvr) restore(design);
  });
}
