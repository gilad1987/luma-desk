// @vitest-environment jsdom
/**
 * Owns the draw of a body without mesh files from the default meshes of the GDTF specification: base, yoke and head
 * each fill their `Length` x `Width` x `Height` box at the place the mesh's own origin gives, a 1.1 base hangs from
 * its mounting plate, the import measures the box that is drawn, the summary says what is shown, and one mesh file
 * serves the whole rig. All products are invented; the meshes are the files the app ships.
 */
import { Box3, Vector3, type BufferGeometry } from 'three';
import { describe, expect, it } from 'vitest';
import { PRIMITIVE_SHAPES } from '../../../../../src/mvr/gdtf/primitiveShapes';
import { PROTO_TRIANGLES } from '../../../../../src/render/fixtures/gdtf/GdtfProtoBuilder';
import { GdtfBodyLibrary } from '../../../../../src/render/fixtures/gdtf/index.ts';
import { MOVER_DROPS, MOVER_SIZES, importShapeRig, shapeMover, shippedDefaultMesh } from '../../../../shared/index.ts';

const FILES = { 'Acme@Mover.gdtf': shapeMover('Mover'), 'Acme@Plate.gdtf': shapeMover('Plate', 'Base1_1') };
const YOKE_Y = MOVER_DROPS.yoke;
const HEAD_Y = MOVER_DROPS.yoke + MOVER_DROPS.head;

const load = async () => {
  const asked: string[] = [];
  const result = await importShapeRig(FILES, ['Acme@Mover', 'Acme@Plate', 'Acme@Mover']);
  const library = new GdtfBodyLibrary(undefined, undefined, (file) => {
    asked.push(file);
    return shippedDefaultMesh(file);
  });
  await library.load(result);
  return { result, library, asked };
};
const protoOf = async (uuid: string) => {
  const proto = (await load()).library.protoOf(uuid);
  if (!proto) throw new Error(`${uuid} has no GDTF body`);
  return proto;
};
/** The box of a section in the root frame, in metres: min x, y, z then max; `drop` is the height of its own frame. */
const drawn = (geometry: BufferGeometry | undefined, drop = 0): number[] => {
  geometry?.computeBoundingBox();
  const { min, max } = geometry?.boundingBox ?? new Box3();
  return [min.x, min.y + drop, min.z, max.x, max.y + drop, max.z];
};
/** The box the table of shapes gives a part of this size at this height; GDTF (x, y, z) is the app (x, z, -y). */
const wanted = (type: string, size: readonly number[], drop = 0): number[] => {
  const { min, max } = PRIMITIVE_SHAPES.get(type)?.box ?? { min: [0, 0, 0], max: [0, 0, 0] };
  const [fx = 0, fy = 0, fz = 0] = size.map((value, axis) => value / ((max[axis] ?? 0) - (min[axis] ?? 0)));
  return [min[0] * fx, min[2] * fz + drop, -max[1] * fy, max[0] * fx, max[2] * fz + drop, -min[1] * fy];
};
/** Largest difference between two boxes, in millimetres. */
const apart = (a: readonly number[], b: readonly number[]): number =>
  Math.max(...a.map((value, index) => Math.abs(value - (b[index] ?? NaN)))) * 1000;

describe('a GDTF body drawn with the default meshes of the specification', () => {
  it('draws base, yoke and head, each filling its model box about the origin of its mesh', async () => {
    const p = await protoOf('U-0');
    expect(apart(drawn(p.base), wanted('Base', MOVER_SIZES.base))).toBeLessThan(1);
    expect(apart(drawn(p.yoke, YOKE_Y), wanted('Yoke', MOVER_SIZES.yoke, YOKE_Y))).toBeLessThan(1);
    expect(apart(drawn(p.head, HEAD_Y), wanted('Head', MOVER_SIZES.head, HEAD_Y))).toBeLessThan(1);
    // the first default meshes are centred on their origin: 0.1 m of base is 0.05 m above and below the device origin
    expect(apart(drawn(p.base), [-0.2, -0.05, -0.15, 0.2, 0.05, 0.15])).toBeLessThan(1);
    expect(apart(drawn(p.head, HEAD_Y), [-0.12, -0.46, -0.12, 0.12, -0.14, 0.12])).toBeLessThan(1);
    // 76 + 68 + 80 triangles of the three files; the pigtail is not drawn
    expect([p.triangles, p.triangles <= PROTO_TRIANGLES, p.moving, p.extraAxes]).toEqual([224, true, true, 0]);
  });

  it('keeps the pan and tilt axes and the lens on the GDTF beam origin', async () => {
    const p = await protoOf('U-0');
    const y = (matrix: typeof p.panAt): number => +new Vector3().setFromMatrixPosition(matrix).y.toFixed(6);
    expect([y(p.panAt), y(p.tiltAt), y(p.lensAt), p.lensIn, p.lensRadius]).toEqual([-0.2, -0.1, -0.16, 'head', 0.05]);
    expect(p.lensOff).toBeCloseTo(-MOVER_DROPS.beam, 6);
  });

  it('hangs a 1.1 base from its mounting plate, which is its origin', async () => {
    const [, minY = NaN, , , maxY = NaN] = drawn((await protoOf('U-1')).base);
    expect([Math.abs(maxY) * 1000 < 1, Math.abs(minY + MOVER_SIZES.base[2]) * 1000 < 1]).toEqual([true, true]);
  });

  it('measures at import the box that is drawn', async () => {
    const { result, library } = await load();
    for (const uuid of ['U-0', 'U-1']) {
      const p = library.protoOf(uuid);
      const boxes = [drawn(p?.base), drawn(p?.yoke, YOKE_Y), drawn(p?.head, HEAD_Y)];
      const span = (low: number): number =>
        Math.max(...boxes.map((box) => box[low + 3] ?? NaN)) - Math.min(...boxes.map((box) => box[low] ?? NaN));
      // GDTF X, Y, Z are the app X, Z, Y
      expect(apart(result.bodies.get(uuid)?.box ?? [], [span(0), span(2), span(1)])).toBeLessThan(1);
    }
    expect(result.bodies.get('U-0')?.box?.map((value: number) => +value.toFixed(3))).toEqual([0.4, 0.3, 0.51]);
  });

  it('shares one body between fixtures of a type and asks for each mesh file once for the rig', async () => {
    const { result, library, asked } = await load();
    expect(library.protoOf('U-0')?.base).toBe(library.protoOf('U-2')?.base);
    const files = ['base', 'base_1.1', 'head', 'yoke'].map((name) => `primitivetype_${name}.3ds`);
    expect([...asked].sort()).toEqual(files);
    expect(library.stats).toEqual({ mesh: 0, shapes: 3, fitted: 0, desk: 0, multiHead: 0, failed: [] });
    expect(result.summary.bodyLines[0]?.message).toBe(
      '2 fixtures of "Mover": the GDTF names standard part shapes and no mesh; ' +
        'the default shapes of the GDTF specification are shown.',
    );
  });
});
