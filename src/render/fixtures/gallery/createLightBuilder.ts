import type { Group } from 'three';
import type { Fixture } from '../../../domain/Fixture';
import {
  createBeamShared,
  createFixtureModels,
  createGoboAtlas,
  createLensTextures,
  createModelMaterials,
  createTrimMaterial,
  FixtureVisualBuilder,
  ModelPrimitives,
  type LightVisual,
} from '..';

/**
 * A builder for light fixtures, booted in the desk's order (`fixtures/index.ts`) with the desk's own models, so a
 * body has the shape and scale the desk draws. Every fixture group and its beam, pool and glow go into `stash`.
 */
export function createLightBuilder(stash: Group): (f: Fixture) => LightVisual {
  const gobo = createGoboAtlas(),
    beam = createBeamShared(),
    trim = createTrimMaterial(),
    lensTextures = createLensTextures(),
    prims = new ModelPrimitives();
  const models = createFixtureModels({ prims, materials: createModelMaterials(trim) });
  const picker = { register: () => undefined };
  const deps = { scene: stash, prims, beam, gobo, models, lensTextures, screenMesh: new Map(), picker };
  const builder = new FixtureVisualBuilder(deps);
  return (f) => {
    const visual = builder.build(f);
    if (visual.kind !== 'light') throw new Error(`Gallery: fixture type ${f.type} builds no light body`);
    return visual;
  };
}
