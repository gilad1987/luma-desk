import { Mesh, Object3D, Scene, type BufferGeometry, type Material } from 'three';
import { vi } from 'vitest';
import type { Fixture } from '../../../../src/domain/Fixture';
import { buildRig } from '../../../../src/domain/rig';
import * as fx from '../../../../src/render/fixtures';

/** A 2D context stand-in: every method is a no-op that returns a gradient-like object. */
const fakeContext = (): object =>
  new Proxy({}, { get: (_, key) => (key === 'roundRect' ? undefined : () => ({ addColorStop: () => undefined })) });

/** Stubs `document` so drawCanvas works in Node; call `vi.unstubAllGlobals()` after. */
export function stubCanvasDocument(): void {
  const createElement = () => ({ width: 0, height: 0, getContext: fakeContext, toDataURL: () => 'data:' });
  vi.stubGlobal('document', { createElement });
}

/** The fixture side of the boot, in the documented order, for the whole 405-fixture rig. */
export function buildFixtureScene() {
  const fixtures: readonly Fixture[] = buildRig().fixtures;
  const scene = new Scene(),
    screenMesh = new Mesh(),
    registered: [Object3D, Fixture][] = [];
  const gobo = fx.createGoboAtlas();
  const beam = fx.createBeamShared();
  const trim = fx.createTrimMaterial();
  const lensTextures = fx.createLensTextures();
  const prims = new fx.ModelPrimitives();
  const kit = { prims, materials: fx.createModelMaterials(trim) };
  const picker = { register: (o: Object3D, f: Fixture) => void registered.push([o, f]) };
  const builder = new fx.FixtureVisualBuilder({
    scene,
    prims,
    beam,
    gobo,
    models: fx.createFixtureModels(kit),
    lensTextures,
    screenMesh,
    picker,
  });
  const visuals = fixtures.map((f) => builder.build(f));
  const state = { haze: 0.5 };
  const props = new fx.Props({ scene, kit, fohRig: [], state, beamHaze: beam.haze });
  return { fixtures, scene, screenMesh, registered, gobo, beam, visuals, props, state };
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
