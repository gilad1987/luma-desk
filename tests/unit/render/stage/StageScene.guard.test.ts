/** A stage rebuild refuses a rig the fixture visuals cannot build before it frees or replaces anything. */
import { BufferGeometry, Material } from 'three';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { rigFromDesign } from '../../../../src/domain/stage/deriveRig';
import { festivalStage } from '../../../../src/domain/stage/templates/festival';
import { BUILT_IN_DESIGN } from '../../../../src/domain/stage/templates/sultansPool/builtInDesign';
import { lightWithoutModel, setupFixtureVisuals } from '../fixtures/fixtureVisualsSetup';
import { bootStageScene } from './stageSceneSetup';

afterEach(() => vi.restoreAllMocks());
afterEach(() => vi.unstubAllGlobals());

describe('StageScene.rebuild guard', () => {
  it('throws for a light type without a model and leaves the old stage whole', () => {
    const { scene, surfaces, views, host, stage } = bootStageScene(BUILT_IN_DESIGN);
    // the real check of the fixture visuals, over the shared fixture kit
    const { visuals } = setupFixtureVisuals(festivalStage());
    host.visuals.assertBuildable.mockImplementation((fixtures) => visuals.assertBuildable(fixtures));
    const festival = rigFromDesign(festivalStage()).fixtures;
    const parts = [...scene.children];
    const freed = [vi.spyOn(BufferGeometry.prototype, 'dispose'), vi.spyOn(Material.prototype, 'dispose')];
    const broken = [...festival, lightWithoutModel(festival)];
    expect(() => stage.rebuild(festivalStage(), broken)).toThrow(/has no model or size/);
    expect(scene.children).toEqual(parts);
    for (const spy of freed) expect(spy).not.toHaveBeenCalled();
    expect(host.visuals.rebuild).toHaveBeenCalledTimes(1);
    expect(host.overlay.setFixtures).toHaveBeenCalledTimes(1);
    expect(surfaces.setSurfaces).toHaveBeenCalledTimes(1);
    expect(views.fitTo).not.toHaveBeenCalled();
    expect(views.setView).not.toHaveBeenCalled();
  });
});
