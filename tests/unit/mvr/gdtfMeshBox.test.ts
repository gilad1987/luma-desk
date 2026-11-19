/**
 * Owns the size of a GDTF body measured on its mesh files: a 3DS file is in millimetres and a glTF file in metres, so
 * a model without Length, Width and Height (nothing scales its mesh) still measures in metres.
 */
import { describe, expect, it } from 'vitest';
import type { GdtfBody, GdtfModel } from '../../../src/mvr/gdtf/GdtfBody.ts';
import { gdtfMeshBox, meshCache, meshTreeSize } from '../../../src/mvr/gdtf/gdtfMeshBox.ts';
import { make3ds } from '../../shared/index.ts';

/** A head of 200 x 200 x 300 mm that hangs below its origin, as a 3DS file in millimetres. */
const HEAD_3DS = make3ds([
  [-100, -100, -300],
  [100, 100, 0],
]);
const identity = new Float64Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
const bodyOf = (size: readonly [number, number, number]): GdtfBody => {
  const model: GdtfModel = {
    name: 'Head',
    file: 'head',
    path: 'models/3ds/head.3ds',
    details: [],
    size,
    primitiveType: '',
  };
  const root = {
    name: 'Head',
    type: 'Geometry',
    tag: 'Geometry',
    position: identity,
    role: 'fixed',
    children: [],
    model,
  };
  return { mode: 'Std', geometry: 'Head', root: { ...root, type: 'Geometry', role: 'fixed' } };
};
const sizeOf = (size: readonly [number, number, number], body = bodyOf(size), bytes = HEAD_3DS): number[] =>
  [...(meshTreeSize(body, () => bytes, meshCache()) ?? [])].map((value) => +value.toFixed(6));

/** A cylinder of 0.3 m across and 0.2 m high with 24 sides, in millimetres; its axis is Z. */
const CYLINDER_3DS = make3ds(
  Array.from({ length: 48 }, (_, i): [number, number, number] => {
    const angle = (Math.floor(i / 2) * Math.PI) / 12;
    return [150 * Math.cos(angle), 150 * Math.sin(angle), i % 2 === 0 ? 0 : -200];
  }),
);
/** A GDTF position turned 45 degrees about Z, column-major. */
const TURNED = new Float64Array([
  Math.SQRT1_2,
  Math.SQRT1_2,
  0,
  0,
  -Math.SQRT1_2,
  Math.SQRT1_2,
  0,
  0,
  0,
  0,
  1,
  0,
  0,
  0,
  0,
  1,
]);

describe('gdtfMeshBox', () => {
  it('reads a 3DS box in metres', () => {
    const box = gdtfMeshBox('models/3ds/head.3ds', HEAD_3DS);
    expect(box?.min.map((value) => +value.toFixed(6))).toEqual([-0.1, -0.1, -0.3]);
    expect(box?.max.map((value) => +value.toFixed(6))).toEqual([0.1, 0.1, 0]);
  });

  it('measures a 3DS part without a model size at 200 x 200 x 300 mm, not at 200 x 200 x 300 m', () => {
    expect(sizeOf([0, 0, 0])).toEqual([0.2, 0.2, 0.3]);
  });

  it('scales a 3DS part to the model size when the model has one', () => {
    expect(sizeOf([0.4, 0.4, 0.6])).toEqual([0.4, 0.4, 0.6]);
  });

  it('measures a round part turned 45 degrees about its own axis on its vertices, within 2 %', () => {
    const upright = bodyOf([0.3, 0.3, 0.2]);
    const turned = { ...upright, ...(upright.root ? { root: { ...upright.root, position: TURNED } } : {}) };
    const [x = 0, y = 0, z = 0] = sizeOf([0.3, 0.3, 0.2], turned, CYLINDER_3DS);
    // the box of the turned box would be 0.3 * sqrt(2) = 0.424 on X and Y
    expect(Math.abs(x - 0.3) / 0.3).toBeLessThan(0.02);
    expect(Math.abs(y - 0.3) / 0.3).toBeLessThan(0.02);
    expect(z).toBeCloseTo(0.2, 6);
  });
});
