import { occlusion } from '../../render/occlusion/occlusion';
import type { MvrBodyInfo } from '../mvr/measureMvrBodies';
import { mvrPlacementHook, type MvrPlacements } from './mvrPlacements';
import { mvrSceneryBoxHook, type MvrSceneryBox } from './mvrSceneryBoxes';
import { readMvrStageInfo, type MvrStageInfo } from './readMvrStageInfo';
import { readViewFit, type ViewFitInfo } from './readViewFit';
import type { TestHookDeps } from './TestHookDeps';

/** The MVR part of `window.__desk.test`; its own file, so `installTestHook` stays the list of the desk's hooks. */
export interface MvrTestApi {
  /** The stage the rig is built from, read live; named for MVR so it does not meet Stage Builder's `stage()`. */
  mvrStage(): MvrStageInfo;
  /** The rig box of an imported stage on screen and the free part of the 3D view (`readViewFit`). */
  viewFit(): ViewFitInfo;
  /** Resolves after the latest MVR load ended (a picked file or the boot restore), with success or failure. */
  mvrReady(): Promise<void>;
  /** True while the MVR scenery shows the layers of a file; the 3D view itself is not inspectable. */
  mvrScenery(): boolean;
  /** True once the lazy MVR post chain draws the frames. */
  mvrPostChain(): boolean;
  /** Each drawn fixture body: the import's plan, the GDTF box and the measured size in metres. */
  mvrBodies(): Promise<readonly MvrBodyInfo[]>;
  /** The exact fit offset and every fixture's drawn pose, for the accuracy spec's independent reader. */
  mvrPlacements(): MvrPlacements;
  /** The world box of each drawn MVR layer group, in the frame of `mvrPlacements`. */
  mvrSceneryBoxes(): MvrSceneryBox[];
  /** Switches the ambient occlusion of the MVR post chain, for an A/B image; it is on until this is called. */
  mvrOcclusion(isOn: boolean): void;
}

/** Builds the MVR hooks from the same deps as the rest of the test API. */
export function mvrHooks(deps: TestHookDeps): MvrTestApi {
  return {
    mvrStage: () => readMvrStageInfo(deps.stage),
    viewFit: () => readViewFit(deps.views),
    mvrReady: deps.mvrReady,
    mvrScenery: deps.mvrScenery,
    mvrPostChain: deps.mvrPostChain,
    mvrBodies: deps.mvrBodies,
    ...mvrPlacementHook(deps),
    ...mvrSceneryBoxHook(deps),
    mvrOcclusion: (isOn) => {
      occlusion.isEnabled = isOn;
    },
  };
}
