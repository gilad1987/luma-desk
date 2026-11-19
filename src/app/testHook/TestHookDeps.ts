import type { Object3D } from 'three';
import type { AutoShow } from '../../autoshow/AutoShow';
import type { CommandRunner } from '../../command/CommandRunner';
import type { AppState } from '../../engine/AppState';
import type { Executor } from '../../engine/Executor';
import type { ExecutorPool } from '../../engine/ExecutorPool';
import type { OutputMerger } from '../../engine/OutputMerger';
import type { Programmer } from '../../engine/Programmer';
import type { Selection } from '../../engine/Selection';
import type { StageService } from '../../engine/stage/StageService';
import type { ShowSerializer } from '../../show';
import type { LayoutMode } from '../../ui/panels/layoutMode';
import type { MvrBodyInfo } from '../mvr/measureMvrBodies';
import type { CameraViews } from '../../render/camera/CameraViews';
import type { FrameStatsRenderer } from './frameStats';
import type { FixtureVisuals } from '../../render/fixtures/FixtureVisuals';

/** What the Playwright test API reads and drives; names follow the legacy main.ts variables. */
export interface TestHookDeps {
  /** The stage: `fixtures`, `outputAt` and `mvrStage()` read its current rig, and the stage hooks drive it. */
  readonly stage: Pick<StageService, 'rig' | 'design' | 'builtIn' | 'apply'>;
  /** The stage's `setView`: the screenshot suite moves the camera with it. */
  readonly setView: (view: string, instant?: boolean) => void;
  readonly selection: Pick<Selection, 'ids'>;
  readonly programmer: Pick<Programmer, 'vals' | 'fxList' | 'applyPhaser'>;
  readonly appState: Pick<AppState, 'selExec' | 'highlight' | 'blackout'>;
  readonly execs: readonly Pick<Executor, 'name' | 'cur' | 'on' | 'level' | 'cues'>[];
  readonly serializer: Pick<ShowSerializer, 'serialize'>;
  readonly pool: Pick<ExecutorPool, 'stepFades'>;
  readonly merger: Pick<OutputMerger, 'compute'>;
  readonly autoShow: Pick<AutoShow, 'modulation'>;
  readonly runner: Pick<CommandRunner, 'run'>;
  /** `renderMemory` and `renderStats` read its info and the frame times wait on its context; a test passes a fake. */
  readonly renderer: FrameStatsRenderer;
  /** The stage camera: `viewFit()` projects the rig box through it. */
  readonly views: Pick<CameraViews, 'camera' | 'controls' | 'table'>;
  /** The current console layout (`deskMode`), owned by the layout area. */
  readonly deskMode: () => LayoutMode;
  /** Resolves after the latest MVR load ended, with success or failure (the MVR load queue). */
  readonly mvrReady: () => Promise<void>;
  /** True while the MVR scenery shows the layers of a file. */
  readonly mvrScenery: () => boolean;
  /** True once the lazy MVR post chain draws the frames; before that an MVR stage draws through the built-in chain. */
  readonly mvrPostChain: () => boolean;
  /** The drawn fixture bodies of the MVR stage, measured at rest (`GdtfBodyFlow.measure`). */
  readonly mvrBodies: () => Promise<readonly MvrBodyInfo[]>;
  /** The drawn fixture groups; `mvrPlacements` reads where each body's mounting point is drawn. */
  readonly fixtureVisuals: Pick<FixtureVisuals, 'visuals'>;
  /** The 3D scene; `mvrSceneryBoxes` finds the drawn MVR layer groups in it. */
  readonly mvrScene: Pick<Object3D, 'traverse'>;
}
