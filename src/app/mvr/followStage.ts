import { boundsOf } from '../../domain/stage/bounds';
import type { StageDesign } from '../../domain/stage/StageDesign';
import type { EngineBus } from '../../engine/events';
import type { StageService } from '../../engine/stage/StageService';
import type { MvrHallLight } from '../../render/lights/MvrHallLight';
import { showTitle } from '../../ui/panels/top/showTitle';
import { showLedBar } from '../../ui/panels/top/ledBar';
import type { GdtfBodyFlow } from './GdtfBodyFlow';
import type { LazyMvrStage } from './LazyMvrStage';
import { drawLedLayers } from './markLedLayers';
import type { MvrFlowDeps } from './MvrFlowDeps';
import { hideLayerList } from './mvrLayerList';
import { showsMvrFile } from './showsMvrFile';
import { closeStaleLayerList } from './stageBoundList';

/** What the stage follower needs: the bus to listen on, the stage to read the cause from, and the MVR parts. */
export interface StageFollowDeps {
  readonly bus: Pick<EngineBus, 'on'>;
  readonly stage: Pick<StageService, 'design' | 'cause'>;
  readonly scenery: Pick<LazyMvrStage, 'dispose' | 'setHiddenLayers' | 'refit'>;
  readonly bodies: Pick<GdtfBodyFlow, 'clear'>;
  readonly prompt: Pick<MvrFlowDeps['prompt'], 'hide'>;
  /** Queues `restoreStoredMvr` of `design` in the MVR load queue, so it cannot draw over a later load. */
  readonly restore: (design: StageDesign) => void;
  /** The hall work light of an MVR stage; on here, placed over the scenery by `MvrSceneryFit`. */
  readonly hall: Pick<MvrHallLight, 'show' | 'hide'>;
}

/**
 * Makes the MVR scenery and the missing-file prompt follow every stage change: a show load, a template, the builder,
 * Load demo rig. Both belong to one MVR file; a stage without MVR data or of another file drops them, and a stage of
 * another MVR file queues the restore of its stored bytes (which shows the prompt when this browser lacks them). A
 * stage of the same file keeps the scenery but takes its hidden layers, which a show load may change, and fits the
 * camera views to the scenery again: the stage scene subscribes first (`wireRender` runs before `wireMvr`), so its
 * rebuild has just fitted them to the design only. The MVR
 * import's own apply (cause `import`) is left to the import flow, which draws its scenery itself after the apply.
 * The follower remembers the source it last saw, from the boot stage on, because the scenery may still be loading.
 *
 * It is also the one owner of the stage title and of whether the hall light is on: both follow the stage kind (MVR
 * data or not) on every change, the import's own included, and not the scenery, which may never arrive (no stored
 * file, a failed chunk). The hall starts over the design's own box; `MvrSceneryFit` moves it once scenery is shown.
 * Returns the same step for the current stage, for the boot, after the top bar exists.
 */
export function followStage(deps: StageFollowDeps): () => void {
  const { bus, stage, scenery, bodies, prompt, restore, hall } = deps;
  const followKind = (design: StageDesign): void => {
    showTitle(design.mvr ? design.source.name.replace(/\.mvr$/i, '') : null);
    if (design.mvr) hall.show(boundsOf(design));
    else hall.hide();
  };
  let shown = stage.design.source;
  bus.on('rigChanged', ({ design }) => {
    const previous = shown;
    shown = design.source;
    // before the import's return: an open list of the stage before must not write into the new one
    closeStaleLayerList(design);
    followKind(design);
    if (stage.cause === 'import') return;
    if (showsMvrFile(design, previous)) {
      scenery.setHiddenLayers(design.mvr.hiddenLayers);
      drawLedLayers(design.mvr.ledLayers ?? []);
      scenery.refit(design);
      return;
    }
    scenery.dispose();
    // the walls went with the scenery; a restore of another MVR file shows the LED level again
    showLedBar(undefined);
    hideLayerList();
    bodies.clear();
    prompt.hide();
    if (design.mvr) restore(design);
  });
  return () => followKind(stage.design);
}
