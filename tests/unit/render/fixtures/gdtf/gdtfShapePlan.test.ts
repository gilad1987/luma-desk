// @vitest-environment jsdom
/**
 * Owns the rules around the default shapes of a GDTF body: a model with a mesh file is drawn from the file whatever
 * primitive it names, a cylinder and a sphere are round, a body of plain solids alone and a part of type `Undefined`
 * without a file keep the desk model, and a default mesh that cannot be loaded is drawn as the box of its shape and
 * reported. All products are invented.
 */
import { Matrix4, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import type { GdtfNode } from '../../../../../src/mvr/gdtf/GdtfBody';
import { DefaultShapes } from '../../../../../src/render/fixtures/gdtf/DefaultShapes';
import { GdtfBodyLibrary } from '../../../../../src/render/fixtures/gdtf/index.ts';
import { importShapeRig, make3ds, shapeMover, shapeStatic, shippedDefaultMesh } from '../../../../shared/index.ts';

/** Two triangles that span 300 x 200 x 500 of a Z-up file and hang below its origin. */
const SPAN = [
  [0, 0, 0],
  [300, 0, 0],
  [0, 200, 0],
  [0, 0, 0],
  [0, 0, -500],
  [300, 0, 0],
] as const;
const OWN = 'Length="0.3" Width="0.2" Height="0.5" PrimitiveType="Head" File="body"';
const FILES = {
  'Acme@Cell.gdtf': shapeStatic('Cell', 'Length="0.2" Width="0.2" Height="0.2" PrimitiveType="Cube"'),
  'Acme@Own.gdtf': shapeStatic('Own', OWN, { 'models/3ds/body.3ds': make3ds(SPAN.map((point) => [...point])) }),
  'Acme@Bare.gdtf': shapeStatic('Bare', 'Length="0.3" Width="0.2" Height="0.5"'),
  'Acme@Mover.gdtf': shapeMover('Mover'),
};
const load = async (library = new GdtfBodyLibrary(undefined, undefined, shippedDefaultMesh)) => {
  const result = await importShapeRig(FILES, ['Acme@Cell', 'Acme@Own', 'Acme@Bare', 'Acme@Mover']);
  await library.load(result);
  return { result, library };
};
const mm = (value: number): number => Math.round(value * 1000) + 0;
/** The vertices of a plain solid of this size, as a part with that primitive draws them. */
const solid = async (primitiveType: string, size: readonly [number, number, number]): Promise<Vector3[]> => {
  const shapes = new DefaultShapes(() => Promise.resolve(undefined), shippedDefaultMesh, []);
  const model = { name: 'M', file: '', details: [], size, primitiveType };
  const fixed = { type: 'Geometry', tag: 'Geometry', position: new Float64Array(16), role: 'fixed' } as const;
  const node: GdtfNode = { name: 'P', ...fixed, children: [], model };
  await shapes.prepare(node);
  const part = shapes.part(node);
  const position = part?.geometry.getAttribute('position');
  const fit = part?.matrix ?? new Matrix4();
  return Array.from({ length: position?.count ?? 0 }, (_, i) =>
    new Vector3(position?.getX(i), position?.getY(i), position?.getZ(i)).applyMatrix4(fit),
  );
};

describe('the rules of GDTF default shapes', () => {
  it('draws a cylinder round about the height axis and a sphere round, at the model size', async () => {
    const cylinder = await solid('Cylinder', [0.2, 0.2, 0.3]);
    // every vertex is on the axis (the cap centres) or on the wall, 0.1 m from it, and on a cap
    const radii = new Set(cylinder.map((point) => mm(Math.hypot(point.x, point.z))));
    const heights = new Set(cylinder.map((point) => mm(point.y)));
    expect([cylinder.length > 48, [...radii].sort(), [...heights].sort()]).toEqual([true, [0, 100], [-150, 150]]);
    const sphere = await solid('Sphere', [0.2, 0.2, 0.2]);
    expect([sphere.length > 100, [...new Set(sphere.map((point) => mm(point.length())))]]).toEqual([true, [100]]);
  });

  it('draws the mesh file of a model that names a primitive too', async () => {
    const { result, library } = await load();
    const own = library.protoOf('U-1');
    own?.base?.computeBoundingBox();
    const { min, max } = own?.base?.boundingBox ?? { min: new Vector3(), max: new Vector3() };
    // the two triangles of the file, fitted to the model size: not the 80 triangles of the default head
    expect([own?.triangles, min.toArray().map(mm), max.toArray().map(mm)]).toEqual([2, [0, -500, -200], [300, 0, 0]]);
    expect([result.bodies.get('U-1')?.bodyClass, result.bodies.get('U-1')?.draw]).toEqual(['mesh', 'gdtf']);
  });

  it('keeps the desk model at the GDTF box for a body of plain solids and for a part without a shape', async () => {
    const { result, library } = await load();
    const plans = ['U-0', 'U-2'].map((uuid) => [result.bodies.get(uuid)?.draw, library.protoOf(uuid)]);
    expect(plans).toEqual(Array.from({ length: 2 }, () => ['deskAtBox', undefined]));
    expect([library.boxOf('U-0'), library.boxOf('U-2')]).toEqual([
      [0.2, 0.2, 0.2],
      [0.3, 0.5, 0.2],
    ]);
    expect(library.stats).toEqual({ mesh: 1, shapes: 1, fitted: 2, desk: 0, multiHead: 0, failed: [] });
  });

  it('draws the box of the shape and reports the file when a default mesh cannot be loaded', async () => {
    const { library } = await load(new GdtfBodyLibrary(undefined, undefined, () => Promise.resolve(undefined)));
    const proto = library.protoOf('U-3');
    proto?.base?.computeBoundingBox();
    const { min, max } = proto?.base?.boundingBox ?? { min: new Vector3(), max: new Vector3() };
    // three boxes of 12 triangles; the base box is where the mesh would be, centred on the device origin
    expect([proto?.triangles, min.toArray().map(mm), max.toArray().map(mm)]).toEqual([
      36,
      [-200, -50, -150],
      [200, 50, 150],
    ]);
    expect(library.stats.failed).toEqual(['base', 'yoke', 'head'].map((name) => `primitivetype_${name}.3ds`));
  });
});
