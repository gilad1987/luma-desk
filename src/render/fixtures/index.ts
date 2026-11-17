/*
 * Fixture visuals. Boot order (decision 24): createGoboAtlas -> createBeamShared -> createTrimMaterial ->
 * createLensTextures -> [render core key lights] -> new ModelPrimitives -> createModelMaterials ->
 * createFixtureModels + FixtureVisualBuilder.build per fixture in array order -> new Props.
 */
export { createGoboAtlas } from './GoboAtlas';
export type { GoboAtlas } from './GoboAtlas';
export { createBeamShared } from './BeamMaterial';
export type { BeamShared, SharedUniform } from './BeamMaterial';
export { createLensTextures } from './LensTextures';
export { ModelPrimitives } from './ModelPrimitives';
export { createModelMaterials, createTrimMaterial } from './modelMaterials';
export { createFixtureModels } from './FixtureModels';
export { FixtureVisualBuilder } from './FixtureVisualBuilder';
export type { FixtureVisualDeps } from './FixtureVisualBuilder';
export type { FixtureVisual, LightVisual } from './FixtureVisual';
export { FixtureVisualSync } from './FixtureVisualSync';
export type { FixtureVisualSyncDeps } from './FixtureVisualSync';
export type { ScreenTargets, ScreenUniforms } from './sync/syncScreen';
export { Props } from './props/Props';
