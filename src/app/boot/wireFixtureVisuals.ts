import type { Fixture } from '../../domain/Fixture';
import type { AppState } from '../../engine/AppState';
import type { Selection } from '../../engine/Selection';
import {
  createBeamShared,
  createFixtureModels,
  createGoboAtlas,
  createLensTextures,
  createModelMaterials,
  createTrimMaterial,
  FixtureVisuals,
  FixtureVisualSync,
  ModelPrimitives,
  Props,
  type BeamShared,
  type GoboAtlas,
} from '../../render/fixtures';
import { KeyLights } from '../../render/lights/KeyLights';
import { LightFrame } from '../../render/lights/LightFrame';
import { FixturePicker } from '../../render/picking/FixturePicker';
import type { FixtureIdOverlay } from '../../render/stage/FixtureIdOverlay';
import type { StageHandles } from './wireStage';

/** The stage parts the fixtures hang in, plus the engine parts their visuals read. */
export interface FixtureVisualDeps {
  readonly stage: StageHandles;
  readonly fixtures: readonly Fixture[];
  readonly selection: Selection;
  readonly appState: AppState;
  /** The fixture-id overlay; the stage scene hands it each new rig. */
  readonly overlay: Pick<FixtureIdOverlay, 'setFixtures'>;
}

/** The fixture visuals and the per-frame objects the frame loop updates. */
export interface FixtureVisualHandles {
  readonly gobo: GoboAtlas;
  readonly beamShared: BeamShared;
  readonly keyLights: KeyLights;
  readonly picker: FixturePicker;
  readonly props: Props;
  readonly lightFrame: LightFrame;
  readonly visualSync: FixtureVisualSync;
  readonly fixtureVisuals: FixtureVisuals;
}

/**
 * Builds every fixture visual and the props in the legacy order (decision 24: each three.js object draws its uuid
 * from the seeded Math.random). The visuals build through the stage scene, which rebuilds them on a new stage; the
 * frame update and the light frame exist first but create no three.js object. The FOH riser joins the camera views'
 * rig before the props build, so the RoboSpot station joins it after the riser and takes the riser's visibility, as
 * it did before.
 */
export function wireFixtureVisuals(deps: FixtureVisualDeps): FixtureVisualHandles {
  const { stage, fixtures, selection, appState, overlay } = deps;
  const { scene, venue, views, sceneLights } = stage;
  const gobo = createGoboAtlas();
  const beamShared = createBeamShared();
  const trimMaterial = createTrimMaterial();
  const lensTextures = createLensTextures();
  const keyLights = new KeyLights(scene);
  const prims = new ModelPrimitives();
  const kit = { prims, materials: createModelMaterials(trimMaterial) };
  const picker = new FixturePicker(stage.canvas, stage.camera);
  const models = createFixtureModels(kit);
  const lightFrame = new LightFrame();
  const visualSync = new FixtureVisualSync({
    selection,
    beamTime: beamShared.time,
    goboTextures: gobo.textures,
    lights: lightFrame,
    surface: stage.surfaceHit,
  });
  const fixtureVisuals = new FixtureVisuals({
    scene,
    prims,
    beam: beamShared,
    gobo,
    models,
    lensTextures,
    picker,
    sync: visualSync,
  });
  stage.stageScene.connect({ visuals: fixtureVisuals, overlay, screenLight: sceneLights.screenLight }, fixtures);
  views.fohRig.add(...venue.fohRig);
  const props = new Props({ scene, kit, fohRig: views.fohRig, state: appState, beamHaze: beamShared.haze });
  return { gobo, beamShared, keyLights, picker, props, lightFrame, visualSync, fixtureVisuals };
}
