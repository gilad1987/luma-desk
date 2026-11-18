import type { StageSource } from '../../domain/stage/types';
import type { EngineBus } from '../../engine/events';
import type { StageService } from '../../engine/stage/StageService';
import type { MvrFlowDeps } from './MvrFlowDeps';

/** What the stage follower needs: the bus to listen on, the stage to read the cause from, and the MVR parts. */
export interface StageFollowDeps {
  readonly bus: Pick<EngineBus, 'on'>;
  readonly stage: Pick<StageService, 'design' | 'cause'>;
  readonly scenery: Pick<MvrFlowDeps['scenery'], 'dispose'>;
  readonly prompt: Pick<MvrFlowDeps['prompt'], 'hide'>;
  /** Queues `restoreStoredMvr` in the MVR load queue, so it cannot draw over a later load. */
  readonly restore: () => void;
}

/**
 * True when both sources name the same MVR file. A builder edit copies the design with a new source that keeps the
 * file hash, and a show load parses a new object, so the hash decides; the same object covers a file not stored.
 */
const sameFile = (shown: StageSource, next: StageSource): boolean =>
  shown === next || (next.fileHash !== undefined && shown.fileHash === next.fileHash);

/**
 * Makes the MVR scenery and the missing-file prompt follow every stage change: a show load, a template, the builder,
 * Load demo rig. Both belong to one MVR file; a stage without MVR data or of another file drops them, and a stage of
 * another MVR file queues the restore of its stored bytes (which shows the prompt when this browser lacks them). The
 * MVR import's own apply (cause `import`) is left to the import flow, which draws its scenery itself after the apply.
 * The follower remembers the source it last saw, from the boot stage on, because the scenery may still be loading.
 */
export function followStage({ bus, stage, scenery, prompt, restore }: StageFollowDeps): void {
  let shown = stage.design.source;
  bus.on('rigChanged', ({ design }) => {
    const previous = shown;
    shown = design.source;
    if (stage.cause === 'import') return;
    if (design.mvr && sameFile(previous, design.source)) return;
    scenery.dispose();
    prompt.hide();
    if (design.mvr) restore();
  });
}
