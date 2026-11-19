import type { EngineBus } from '../../engine/events';
import type { ExecutorPool } from '../../engine/ExecutorPool';
import type { StageService } from '../../engine/stage/StageService';
import type { PostFx } from '../../render/stage/PostFx';
import type { StartingShowDeps } from '../../show/startingShow/StartingShow';
import type { TestHookDeps } from '../testHook/TestHookDeps';
import type { MvrExportOut } from './exportStageMvr';
import type { StageFollowDeps } from './followStage';
import type { GdtfBodyFlowDeps } from './GdtfBodyFlow';
import type { MvrSceneryRender } from './LazyMvrStage';
import type { MvrFlowDeps } from './MvrFlowDeps';

/** What the MVR wiring needs from the composition root. */
export interface MvrWiringDeps {
  readonly bus: Pick<EngineBus, 'emit' | 'on'>;
  /** The scene the scenery joins and the camera views it fits; read only from the first MVR load on. */
  readonly render: MvrSceneryRender & {
    readonly postFx: Pick<PostFx, 'followMvr' | 'mvrChainReady' | 'sceneDepth' | 'hasMvrChainFailed'>;
  } & {
    readonly fixtureVisuals: GdtfBodyFlowDeps['visuals'];
    readonly sceneLights: { readonly hall: StageFollowDeps['hall'] & MvrSceneryRender['sceneLights']['hall'] };
    readonly views: TestHookDeps['views'];
    /** The scenery joins it (`add`); the test hook's scenery boxes look for the layer groups in it. */
    readonly scene: MvrSceneryRender['scene'] & TestHookDeps['mvrScene'];
  };
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
