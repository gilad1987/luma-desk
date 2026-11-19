/**
 * Owns the table of GDTF default shapes on the import side: its bounds are the bounds of the mesh files the app
 * ships (the default meshes of the GDTF specification, `docs/gdtf-default-meshes.md`), the box of a part without a
 * mesh file follows them, and a tree is planned on the shapes only when they draw its whole housing.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { GdtfNode } from '../../../src/mvr/gdtf/GdtfBody';
import { partBox } from '../../../src/mvr/gdtf/gdtfPartBox';
import { treeSize } from '../../../src/mvr/gdtf/gdtfTreeSize';
import { PRIMITIVE_SHAPES } from '../../../src/mvr/gdtf/primitiveShapes';
import { isShapedTree } from '../../../src/mvr/gdtf/shapedTree';
import { tdsBounds } from '../../../src/mvr/mesh/tdsBounds';
import { DEFAULT_MESH_DIR } from '../../shared/index.ts';

type Size = readonly [number, number, number];
const at = (z: number): Float64Array => new Float64Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, z, 1]);
const part = (primitiveType: string, size: Size, fields: Partial<GdtfNode> = {}, path?: string): GdtfNode => ({
  ...{ name: primitiveType, type: 'Geometry', tag: 'Geometry', position: at(0), role: 'fixed', children: [] },
  model: { name: primitiveType, file: '', details: [], size, primitiveType, ...(path ? { path } : {}) },
  ...fields,
});
/** The Z range of a part's own box, in millimetres. */
const heights = (node: GdtfNode, isRoot = true): number[] => {
  const box = partBox(node, isRoot, undefined)?.box;
  return box ? [Math.round(box.min[2] * 1000), Math.round(box.max[2] * 1000) + 0] : [];
};
const meshes = [...PRIMITIVE_SHAPES].flatMap(([type, shape]) =>
  shape.mesh ? [[type, shape.mesh, shape.box] as const] : [],
);

describe('the GDTF default shapes on the import side', () => {
  it('has a shape for every primitive of the GDTF list but Undefined and Pigtail', () => {
    const solids = ['Cube', 'Cylinder', 'Sphere'];
    const first = ['Base', 'Yoke', 'Head', 'Scanner', 'Conventional'];
    expect([...PRIMITIVE_SHAPES.keys()]).toEqual([...solids, ...first, 'Base1_1', 'Scanner1_1', 'Conventional1_1']);
    expect(readdirSync(DEFAULT_MESH_DIR).sort()).toEqual(meshes.map(([, file]) => file).sort());
  });

  it.each(meshes)('holds the bounds of the shipped mesh of %s', (_, file, box) => {
    const real = tdsBounds(new Uint8Array(readFileSync(join(DEFAULT_MESH_DIR, file))));
    const all = (bounds: typeof box | undefined): number[] => [...(bounds?.min ?? []), ...(bounds?.max ?? [])];
    const worst = Math.max(...all(real).map((value, index) => Math.abs(value - (all(box)[index] ?? NaN))));
    expect([all(real).length, worst < 1e-4]).toEqual([6, true]);
  });

  it('places a part by the origin of its shape: centred at first, at the mounting plate from 1.1', () => {
    expect(heights(part('Base', [0.4, 0.3, 0.1]))).toEqual([-50, 50]);
    expect(heights(part('Yoke', [0.4, 0.1, 0.3]), false)).toEqual([-150, 150]);
    expect(heights(part('Base1_1', [0.4, 0.3, 0.1]))).toEqual([-100, 0]);
    expect(heights(part('Conventional1_1', [0.3, 0.3, 0.5]), false)).toEqual([-500, 0]);
    expect(heights(part('Cylinder', [0.2, 0.2, 0.3]))).toEqual([-150, 150]);
    // a scanner reaches to one side of its origin on Y: 0.6674 of its width
    const scanner = partBox(part('Scanner1_1', [0.2, 0.5, 0.2]), false, undefined);
    expect([scanner?.centred, scanner?.box.min[1].toFixed(3), scanner?.box.max[1].toFixed(3)]).toEqual([
      false,
      '-0.334',
      '0.166',
    ]);
  });

  it('keeps the rules of a part without a shape: no pigtail, a root that hangs, a file that wins', () => {
    expect(heights(part('Pigtail', [0.1, 0.1, 0.1]))).toEqual([]);
    expect(heights(part('Undefined', [0.4, 0.3, 0.1]))).toEqual([-100, 0]);
    expect(heights(part('Base', [0, 0, 0]))).toEqual([]);
    // a model with a file is not measured on the default shape, even when the file is not read here
    expect(heights(part('Head', [0.4, 0.3, 0.1], {}, 'models/3ds/head.3ds'), false)).toEqual([-50, 50]);
    expect(partBox(part('Head', [0.4, 0.3, 0.1], {}, 'models/3ds/head.3ds'), false, undefined)?.centred).toBe(true);
  });

  it('measures a tree of shapes whole: a centred yoke is not cut at the device origin', () => {
    const yoke = part('Yoke', [0.36, 0.12, 0.3], { position: at(-0.1) });
    expect(treeSize(part('Base1_1', [0.4, 0.3, 0.1], { children: [yoke] }))?.map((v) => +v.toFixed(3))).toEqual([
      0.4, 0.3, 0.3,
    ]);
  });

  it('plans the shapes only for a tree whose housing they draw whole', () => {
    const beam = { beamType: 'Spot', beamAngle: 10, fieldAngle: 12, beamRadius: 0.05, luminousFlux: 1000 };
    const lens = part('Undefined', [0.1, 0.1, 0.02], { beam });
    const tail = part('Pigtail', [0.1, 0.1, 0.1]);
    const bare = part('Undefined', [0.2, 0.2, 0.2]);
    const tree = (...children: GdtfNode[]): GdtfNode => part('Base', [0.4, 0.3, 0.1], { children });
    expect([tree(lens, tail), tree(bare), bare, part('Head', [0, 0, 0])].map(isShapedTree)).toEqual([
      ...[true, false],
      ...[false, false],
    ]);
  });
});
