/** The crowd of each venue kind: on flat ground outside Sultan's Pool, and hidden objects when the design hides it. */
import { InstancedMesh, Matrix4, Vector3, type Object3D } from 'three';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { StageDesign } from '../../../../src/domain/stage/StageDesign';
import { createTemplate } from '../../../../src/domain/stage/templates';
import { BUILT_IN_DESIGN } from '../../../../src/domain/stage/templates/sultansPool/builtInDesign';
import { SceneryRegistry } from '../../../../src/render/stage/SceneryRegistry';
import { bootStageScene } from './stageSceneSetup';

afterEach(() => vi.restoreAllMocks());
afterEach(() => vi.unstubAllGlobals());

/** The heights of every instance of the crowd's instanced meshes (people, heads, raised arms) of `design`'s venue. */
function crowdHeights(design: StageDesign): number[] {
  const register = vi.spyOn(SceneryRegistry.prototype, 'register');
  bootStageScene(design);
  const crowd = register.mock.calls.filter(([part]) => part === 'crowd').flatMap(([, ...objects]) => objects);
  register.mockRestore();
  const matrix = new Matrix4(),
    at = new Vector3();
  return crowd
    .filter((o): o is InstancedMesh => o instanceof InstancedMesh)
    .flatMap((mesh) =>
      Array.from({ length: mesh.count }, (_, i) => at.setFromMatrixPosition((mesh.getMatrixAt(i, matrix), matrix)).y),
    );
}

describe('StageScene crowd', () => {
  it('stands the back rows on the flat ground in the black box and the open field, on tiers in Sultan’s Pool', () => {
    for (const template of ['empty', 'festival'] as const) {
      const heights = crowdHeights(createTemplate(template));
      expect(heights.length).toBeGreaterThan(0);
      // a terrace spot is the ground + 0.05 and the people stand 0.05 lower: 0 on flat ground
      expect(Math.max(...heights)).toBeLessThan(0.5);
    }
    expect(Math.max(...crowdHeights(BUILT_IN_DESIGN))).toBeGreaterThan(1);
  });

  it('builds every crowd object of a design that hides the crowd invisible', () => {
    const register = vi.spyOn(SceneryRegistry.prototype, 'register');
    const empty = createTemplate('empty');
    expect(empty.scenery.crowd).toBe(false);
    bootStageScene(empty);
    const crowd = register.mock.calls.filter(([part]) => part === 'crowd').flatMap(([, ...objects]) => objects);
    expect(crowd.length).toBeGreaterThan(0);
    expect(crowd.map((o: Object3D) => o.visible)).toEqual(crowd.map(() => false));
  });
});
