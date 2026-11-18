import { Mesh, Object3D, Scene, type BufferGeometry, type Material, type Texture } from 'three';
import type { Fixture } from '../../../../src/domain/Fixture';
import { buildRig } from '../../../../src/domain/rig';
import { FohRig } from '../../../../src/render/camera/FohRig';
import * as fx from '../../../../src/render/fixtures';
import { KeyLights } from '../../../../src/render/lights/KeyLights';

/** What exists before the fixture boot starts; create it outside the seeded window, as the page does. */
export interface FixtureStage {
  readonly scene: Scene;
  readonly screenMesh: Mesh;
  readonly fixtures: readonly Fixture[];
}

/** A stage with the 405-fixture rig and an empty scene. */
export const createFixtureStage = (): FixtureStage => ({
  scene: new Scene(),
  screenMesh: new Mesh(),
  fixtures: buildRig().fixtures,
});

/**
 * The fixture side of the boot in the documented order, with render core's key lights at their legacy point.
 * `swapTrimAndLens` creates the trim material after the lens textures: a one-object reorder for the parity test.
 */
export function buildFixtureScene({ scene, screenMesh, fixtures }: FixtureStage = createFixtureStage(), swap = false) {
  const picks = new Set<Object3D>();
  const gobo = fx.createGoboAtlas();
  const beam = fx.createBeamShared();
  const early = swap ? null : fx.createTrimMaterial();
  const lensTextures = fx.createLensTextures();
  const trim = early ?? fx.createTrimMaterial();
  new KeyLights(scene);
  const prims = new fx.ModelPrimitives();
  const kit = { prims, materials: fx.createModelMaterials(trim) };
  const picker = { register: (o: Object3D) => void picks.add(o) };
  const models = fx.createFixtureModels(kit);
  const builder = new fx.FixtureVisualBuilder({ scene, prims, beam, gobo, models, lensTextures, screenMesh, picker });
  const visuals = fixtures.map((f) => builder.build(f));
  const state = { haze: 0.5 };
  const props = new fx.Props({ scene, kit, fohRig: new FohRig(), state, beamHaze: beam.haze });
  const { panel, vent, alu } = kit.materials;
  const { cylinderGeo, boxGeo, circleGeo, planeGeo, poolGeo, sphereGeo, torusGeo } = prims;
  const resources: (Texture | BufferGeometry | Material)[] = [...gobo.textures, gobo.glow, beam.geometry, trim];
  resources.push(...Object.values(lensTextures), cylinderGeo, boxGeo, circleGeo, planeGeo, poolGeo, sphereGeo);
  resources.push(torusGeo, panel, vent, alu);
  return {
    fixtures,
    scene,
    screenMesh,
    picks,
    gobo,
    beam,
    visuals,
    props,
    state,
    resources,
    prims,
    models,
    lensTextures,
  };
}

const isMesh = (o: Object3D): o is Mesh<BufferGeometry, Material | Material[]> => o instanceof Mesh;

/** Every object's uuid in scene order: equal lists mean equal creation order under a seeded Math.random. */
export function uuidTrace(root: Object3D): string[] {
  const out: string[] = [];
  root.traverse((o) => {
    out.push(o.uuid);
    if (!isMesh(o)) return;
    const mesh = o;
    out.push(mesh.geometry.uuid, ...[mesh.material].flat().map((m) => m.uuid));
  });
  return out;
}
