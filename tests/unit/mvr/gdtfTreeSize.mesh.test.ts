/**
 * Owns the overall box of a GDTF body: measured on the real mesh of each part, scaled to its model size about the
 * mesh origin and placed through the Position chain; the root part without a mesh hangs below its origin (GDTF:
 * "0,0,0 - center base plate"), a deeper one is centred on its origin, a mounting-plate primitive hangs at any depth;
 * the pigtail and wiring objects are left out.
 */
import { describe, expect, it } from 'vitest';
import type { GdtfModel, GdtfNode } from '../../../src/mvr/gdtf/GdtfBody.ts';
import { treeSize } from '../../../src/mvr/gdtf/gdtfTreeSize.ts';
import type { Aabb } from '../../../src/mvr/math/Aabb.ts';

/** A GDTF position that only moves down by `z` metres, column-major. */
const below = (z: number): Float64Array => new Float64Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, -z, 1]);
const model = (name: string, size: readonly [number, number, number], primitiveType = 'Undefined'): GdtfModel => ({
  ...{ name, file: name, details: [], size, primitiveType },
});
const part = (name: string, fields: Partial<GdtfNode>): GdtfNode => ({
  ...{ name, type: 'Geometry', tag: 'Geometry', position: below(0), role: 'fixed', children: [] },
  ...fields,
});
const round = (size: readonly number[] | undefined): number[] => (size ?? []).map((value) => +value.toFixed(6));

/** A base 0.1 m high with a head `drop` m below it; the head model is 0.2 x 0.2 x 0.4 m. */
const HEAD = model('Head', [0.2, 0.2, 0.4]);
const BASE = model('Base', [0.3, 0.2, 0.1]);
const tree = (head: GdtfModel = HEAD, extra: GdtfNode[] = [], drop = 0.3): GdtfNode =>
  part('Base', { model: BASE, children: [part('Head', { model: head, position: below(drop) }), ...extra] });
/** The head mesh: it reaches 0.3 m below its origin and 0.1 m above, 0.05 m off-centre on X. */
const HEAD_MESH: Aabb = { min: [-0.05, -0.1, -0.3], max: [0.15, 0.1, 0.1] };
const meshOf = (wanted: GdtfModel): { box: Aabb } | undefined => (wanted === HEAD ? { box: HEAD_MESH } : undefined);

describe('treeSize', () => {
  it('measures a part on its mesh, scaled to the model size about the mesh origin', () => {
    // the base hangs: Z 0 to -0.1; the head mesh spans -0.3 + 0.1 to -0.3 - 0.3
    // on X the base spans -0.15 to 0.15 and the head mesh -0.05 to 0.15
    expect(round(treeSize(tree(), meshOf))).toEqual([0.3, 0.2, 0.6]);
  });

  it('hangs the root part without a mesh below its origin and centres a deeper one on its own', () => {
    // the base spans Z 0 to -0.1 (not 0.05 to -0.05), the head box -0.1 to -0.5
    expect(round(treeSize(tree()))).toEqual([0.3, 0.2, 0.5]);
  });

  it('hangs a mounting-plate primitive below its origin at any depth', () => {
    // the head hangs from -0.3 down to -0.7; to the millimetre, because the box is the one of the real default mesh,
    // whose plate is 0.03 % of its height under its origin
    const size = treeSize(tree(model('Can', [0.2, 0.2, 0.4], 'Conventional1_1')));
    expect(size?.map((value) => +value.toFixed(3))).toEqual([0.3, 0.2, 0.7]);
  });

  it('cuts an assumed centred box at the base plate, and never a measured mesh', () => {
    // 0.05 m below the plate the centred head box spans 0.15 to -0.25: it does not rise through the plate
    expect(round(treeSize(tree(HEAD, [], 0.05)))).toEqual([0.3, 0.2, 0.25]);
    // the measured mesh spans 0.05 to -0.35 and is kept whole
    expect(round(treeSize(tree(HEAD, [], 0.05), meshOf))).toEqual([0.3, 0.2, 0.4]);
  });

  it('leaves the pigtail and wiring objects out of the box', () => {
    const tail = part('Tail', { model: model('Tail', [2, 2, 2], 'Pigtail') });
    const plug = part('Plug', { model: model('Plug', [3, 3, 3]), tag: 'WiringObject' });
    expect(round(treeSize(tree(HEAD, [tail, plug])))).toEqual([0.3, 0.2, 0.5]);
  });
});
