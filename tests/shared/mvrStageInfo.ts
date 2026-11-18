/** One fixture of the current rig and its DMX patch (null when unpatched), so a round trip can compare both. */
export interface StageFixturePatch {
  id: number;
  /** The app's `DmxPatch` shape, written out: the suite reads the app only through this API, never from src. */
  patch: { universe: number; address: number; mode: string } | null;
}

/**
 * The stage the rig is built from, as `__desk.test.mvrStage()` returns it. MVR specs read it instead of the 3D view,
 * because the scene is drawn only on request in test mode and its meshes say nothing about ids or patch.
 */
export interface MvrStageInfo {
  kind: 'template' | 'builder' | 'mvr';
  /** The `.mvr` file name an MVR stage came from; absent for templates and builder stages. */
  fileName?: string;
  fixtureCount: number;
  /** In rig order. */
  patches: StageFixturePatch[];
}
