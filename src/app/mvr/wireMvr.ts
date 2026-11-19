import type { StageDesign } from '../../domain/stage/StageDesign';
import { downloadBlob } from '../../io/download';
import { surfaceLight } from '../../render/lighting/surfaceLight';
import { StartingShow } from '../../show/startingShow/StartingShow';
import type { TestHookDeps } from '../testHook/TestHookDeps';
import type { MvrActions } from '../../ui/panels/mvr/MvrActions';
import { MvrMissingPrompt } from '../../ui/panels/mvr/MvrMissingPrompt';
import { mvrShow } from './mvrShow';
import { exportStageMvr, type MvrExportOut } from './exportStageMvr';
import { followStage } from './followStage';
import { GdtfBodyFlow } from './GdtfBodyFlow';
import { importPickedMvr } from './importPickedMvr';
import { LazyMvrStage } from './LazyMvrStage';
import { loadDemoRig } from './loadDemoRig';
import { MvrLoadQueue } from './MvrLoadQueue';
import type { MvrFlowDeps } from './MvrFlowDeps';
import type { MvrWiringDeps } from './MvrWiringDeps';
import { openMvrStore } from './openMvrStore';
import { restoreStoredMvr } from './restoreStoredMvr';

/** The MVR area as the composition root uses it. */
export interface MvrWiring {
  /** The Show File dialog's MVR row. */
  readonly actions: MvrActions;
  /** Shows the title and hall of the stage as it is now and queues its boot restore; call it after the show restore. */
  readonly restore: () => void;
  /**
   * The test hook's MVR reads, in its own names so the composition root spreads them: `mvrReady()` resolves after
   * the latest MVR load or export and the latest post chain load ended, `mvrScenery()` is true while the scenery shows the layers of a file.
   */
  readonly testHook: Pick<
    TestHookDeps,
    'mvrReady' | 'mvrScenery' | 'mvrPostChain' | 'mvrBodies' | 'fixtureVisuals' | 'views' | 'mvrScene'
  >;
}

/** The message of any error, for the toast of a failed load or export. */
const messageOf = (error: unknown): string => (error instanceof Error ? error.message : String(error));

/**
 * Builds the MVR area (plan §6): the file store, the lazy scenery, the load queue and the missing-file prompt. Every
 * `stage.apply` it makes runs in the queue, so a load that still runs cannot draw its scenery over a later choice.
 * The export runs in the queue too, so it exports the design of an import that ran when Export was clicked. The
 * stage follower (`followStage`) keeps the scenery, the prompt, the title and the hall on the current stage. It
 * creates no three.js object until the first MVR stage.
 */
export function wireMvr(wiring: MvrWiringDeps): MvrWiring {
  const { bus, render, stage, pool, modal, cancelBuilder, download = downloadBlob } = wiring;
  const toast: MvrExportOut['toast'] = (text, action) =>
    bus.emit('message', { kind: 'toast', text, ...(action ? { action } : {}) });
  const queue = new MvrLoadQueue((error) => toast(messageOf(error)));
  const actions: MvrActions = {
    importFile: (file) => queue.run(() => importPickedMvr(file, deps)),
    loadDemoRig: () => queue.run(() => loadDemoRig(deps)),
    exportMvr: () => queue.run(() => exportStageMvr(stage.design, { toast, download, store, modal })),
  };
  const prompt = new MvrMissingPrompt(actions);
  const scenery = new LazyMvrStage(render);
  // an MVR stage draws through the HDR post chain; a built-in stage keeps the legacy chain
  render.postFx.followMvr(() => scenery.hasScenery);
  // its surface light replaces the floor decals from the first frame; a stage it never comes to keeps the decals
  surfaceLight.isAwaited = () =>
    stage.design.mvr !== undefined && (scenery.hasScenery || queue.isBusy) && !render.postFx.hasMvrChainFailed;
  const show = mvrShow(new StartingShow({ ...wiring, execs: pool.execs }), toast);
  const store = openMvrStore();
  const bodies = new GdtfBodyFlow({ visuals: render.fixtureVisuals, design: () => stage.design });
  const deps: MvrFlowDeps = { stage, store, scenery, bodies, prompt, toast, modal, cancelBuilder, show };
  const restore = (design: StageDesign): void => queue.run(() => restoreStoredMvr(deps, design));
  const followKind = followStage({ bus, stage, scenery, bodies, prompt, restore, hall: render.sceneLights.hall });
  return {
    actions,
    restore: () => {
      followKind();
      restore(stage.design);
    },
    testHook: {
      mvrReady: () => queue.ready().then(() => render.postFx.mvrChainReady()),
      mvrScenery: () => scenery.hasScenery,
      // the chain loads on the first MVR frame; a spec waits for it, so its picture does not depend on the load time
      mvrPostChain: () => render.postFx.sceneDepth !== undefined,
      mvrBodies: () => bodies.measure(),
      fixtureVisuals: render.fixtureVisuals,
      views: render.views,
      mvrScene: render.scene,
    },
  };
}
