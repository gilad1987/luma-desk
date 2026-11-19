import { Mesh, Scene, Vector3, type BufferGeometry, type Texture } from 'three';
import { vi } from 'vitest';
import { Fixture } from '../../../../../src/domain/Fixture';
import { PRODUCT_IDS, PRODUCTS, type ProductId } from '../../../../../src/domain/fixtureProducts';
import * as fx from '../../../../../src/render/fixtures';
import { stubCanvasDocument } from '../../stubCanvasDocument';

/** The first product id of each body family, in catalogue order, so a new family is covered with no test edit. */
export function firstProductOfEachFamily(): ProductId[] {
  const firsts = new Map<string, ProductId>();
  for (const id of PRODUCT_IDS) if (!firsts.has(PRODUCTS[id].body.family)) firsts.set(PRODUCTS[id].body.family, id);
  return [...firsts.values()];
}

/** The boot before the model table, then the spy, so only the table and the fixtures count. */
export function bootThenSpy() {
  stubCanvasDocument();
  const scene = new Scene();
  const gobo = fx.createGoboAtlas();
  const beam = fx.createBeamShared();
  const lensTextures = fx.createLensTextures();
  const prims = new fx.ModelPrimitives();
  const kit = { prims, materials: fx.createModelMaterials(fx.createTrimMaterial()) };
  const spy = vi.spyOn(Math, 'random');
  const models = fx.createFixtureModels(kit);
  const picker = { register: () => undefined };
  const builder = new fx.FixtureVisualBuilder({
    scene,
    prims,
    beam,
    gobo,
    models,
    lensTextures,
    screenMesh: new Map(),
    picker,
  });
  let nextId = 9001;
  /** A new fixture of product `id` as its base type, built into a light visual. */
  const build = (id: ProductId): fx.LightVisual => {
    const fixture = new Fixture({
      id: nextId++,
      type: PRODUCTS[id].base,
      pos: new Vector3(),
      mount: 'hang',
      fixed: null,
      product: id,
    });
    const visual = builder.build(fixture);
    if (visual.kind !== 'light') throw new Error(`bootThenSpy: product ${id} must build a light visual`);
    return visual;
  };
  return { spy, models, build };
}

/**
 * The lens face on the mesh of the visual that wears the fixture's own lens material, found by material, not by child
 * order, so every family answers the same way.
 * @throws Error when no mesh of the visual wears its lens material: the face would never be seen.
 */
export function lensFace(v: fx.LightVisual): Texture | null {
  let worn = false;
  v.g.traverse((o) => {
    if (o instanceof Mesh && o.material === v.lensMat) worn = true;
  });
  if (!worn) throw new Error(`lensFace: no mesh of fixture ${v.fixture.id} wears its lens material`);
  return v.lensMat.map;
}

/** The geometry of every mesh in the fixture group, in traversal order (world-space beam, pool and pix excluded). */
export function groupGeometries(v: fx.LightVisual): BufferGeometry[] {
  const geometries: BufferGeometry[] = [];
  v.g.traverse((o) => {
    if (o instanceof Mesh) geometries.push(o.geometry as BufferGeometry);
  });
  return geometries;
}
