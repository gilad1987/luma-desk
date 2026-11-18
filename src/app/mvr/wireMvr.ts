import type { StageDesign } from '../../domain/stage/StageDesign';
import type { EngineBus } from '../../engine/events';
import type { ExecutorPool } from '../../engine/ExecutorPool';
import type { StageService } from '../../engine/stage/StageService';
import { downloadBlob } from '../../io/download';
import { StartingShow, type StartingShowDeps } from '../../show/startingShow/StartingShow';
import type { TestHookDeps } from '../testHook/TestHookDeps';
import type { MvrActions } from '../../ui/panels/mvr/MvrActions';
import { MvrMissingPrompt } from '../../ui/panels/mvr/MvrMissingPrompt';
import { mvrShow } from './mvrShow';
import { exportStageMvr, type MvrExportOut } from './exportStageMvr';
import { followStage } from './followStage';
import { importPickedMvr } from './importPickedMvr';
import type { PostFx } from '../../render/stage/PostFx';
import { LazyMvrStage, type MvrSceneryRender } from './LazyMvrStage';
import { loadDemoRig } from './loadDemoRig';
import { MvrLoadQueue } from './MvrLoadQueue';
import type { MvrFlowDeps } from './MvrFlowDeps';
import { openMvrStore } from './openMvrStore';
import { restoreStoredMvr } from './restoreStoredMvr';

/** What the MVR wiring needs from the composition root. */
export interface MvrWiringDeps {
  readonly bus: Pick<EngineBus, 'emit' | 'on'>;
  /** The scene the scenery joins and the camera views it fits; read only from the first MVR load on. */
  readonly render: MvrSceneryRender & { readonly postFx: Pick<PostFx, 'followMvr'> };
  /** The flows' stage; the stage follower reads the cause of the last apply, the starting show the rest. */
  readonly stage: MvrFlowDeps['stage'] & Pick<StageService, 'cause' | 'rig' | 'frame' | 'isBuiltIn'>;
  /** The operator's executors; an import rebuilds or keeps their cues. */
  readonly pool: Pick<ExecutorPool, 'execs'>;
  readonly demo: StartingShowDeps['demo'];
  readonly groupLibrary: StartingShowDeps['groupLibrary'];
  readonly presetLibrary: StartingShowDeps['presetLibrary'];
  /** The shared modal; the panels build it after `wireMvr`, so it is read when a flow runs. */
  readonly modal: MvrFlowDeps['modal'];
  /** The Stage Builder's cancel; the builder is built after the panels, so it is read when a flow applies. */
  readonly cancelBuilder: MvrFlowDeps['cancelBuilder'];
  /** Saves an exported file; defaults to the browser download, tests pass a recorder (the page has no download). */
  readonly download?: MvrExportOut['download'];
}

/** The MVR area as the composition root uses it. */
export interface MvrWiring {
  /** The Show File dialog's MVR row. */
  readonly actions: MvrActions;
  /** Queues the boot restore of the stage as it is now; call it after the show restore. */
  readonly restore: () => void;
  /**
   * The test hook's MVR reads, in its own names so the composition root spreads them: `mvrReady()` resolves after
   * the latest MVR load or export ended, `mvrScenery()` is true while the scenery shows the layers of a file.
   */
  readonly testHook: Pick<TestHookDeps, 'mvrReady' | 'mvrScenery'>;
}

/** The message of any error, for the toast of a failed load or export. */
const messageOf = (error: unknown): string => (error instanceof Error ? error.message : String(error));

/**
 * Builds the MVR area (plan §6): the file store, the lazy scenery, the load queue and the missing-file prompt. Every
 * `stage.apply` it makes runs in the queue, so a load that still runs cannot draw its scenery over a later choice.
 * The export runs in the queue too, so it exports the design of an import that ran when Export was clicked. The
 * stage follower (`followStage`) keeps the scenery and the prompt on the current stage. It creates no three.js object
 * until the first MVR load.
 */
export function wireMvr(wiring: MvrWiringDeps): MvrWiring {
  const { bus, render, stage, pool, modal, cancelBuilder, download = downloadBlob } = wiring;
  const toast = (text: string): void => bus.emit('message', { kind: 'toast', text });
  const queue = new MvrLoadQueue((error) => toast(messageOf(error)));
  const actions: MvrActions = {
    importFile: (file) => queue.run(() => importPickedMvr(file, deps)),
    loadDemoRig: () => queue.run(() => loadDemoRig(deps)),
    exportMvr: () => queue.run(() => exportStageMvr(stage.design, { toast, download })),
  };
  const prompt = new MvrMissingPrompt(actions);
  const scenery = new LazyMvrStage(render);
  // an MVR stage draws through the HDR post chain; a built-in stage keeps the legacy chain
  render.postFx.followMvr(() => scenery.hasScenery);
  const show = mvrShow(new StartingShow({ ...wiring, execs: pool.execs }), toast);
  const store = openMvrStore();
  const deps: MvrFlowDeps = { stage, store, scenery, prompt, toast, modal, cancelBuilder, show };
  const restore = (design: StageDesign): void => queue.run(() => restoreStoredMvr(deps, design));
  followStage({ bus, stage, scenery, prompt, restore });
  return {
    actions,
    restore: () => restore(stage.design),
    testHook: { mvrReady: () => queue.ready(), mvrScenery: () => scenery.hasScenery },
  };
}
