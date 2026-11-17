/**
 * `glbBounds` against hostile GLB files: node lists that repeat a child must not multiply the walk (a 76-byte file
 * once needed 2^65 visits), and fields of the wrong type must be dropped instead of becoming a NaN box.
 */
import { describe, expect, it } from 'vitest';
import { glbBounds } from '../../../src/mvr/mesh/glbBounds.ts';
import { makeGlb } from '../../shared/index.ts';

const MESH = { meshes: [{ primitives: [{ attributes: { POSITION: 0 } }] }] };
const BOX = { accessors: [{ min: [0, 0, 0], max: [1, 2, 3] }] };
const flat = (bytes: Uint8Array): number[] | undefined => {
  const box = glbBounds(bytes);
  return box && [...box.min, ...box.max];
};

describe('glbBounds on hostile files', () => {
  it('visits a node that lists itself twice once, fast', () => {
    const start = performance.now();
    const box = flat(makeGlb({ ...MESH, ...BOX, nodes: [{ mesh: 0, children: [0, 0] }], scenes: [{ nodes: [0] }] }));
    expect([box, performance.now() - start < 200]).toEqual([[0, 0, 0, 1, 2, 3], true]);
  });

  it('walks a 60-node chain where each node lists the next twice in linear time', () => {
    const nodes = Array.from({ length: 60 }, (_unused, i) => (i < 59 ? { children: [i + 1, i + 1] } : { mesh: 0 }));
    const start = performance.now();
    const box = flat(makeGlb({ ...MESH, ...BOX, nodes, scenes: [{ nodes: [0] }] }));
    expect([box, performance.now() - start < 200]).toEqual([[0, 0, 0, 1, 2, 3], true]);
  });

  it('gives no box for an accessor min/max that is not three numbers', () => {
    const accessors = [{ min: ['a', 0, 0], max: [1, 2, 3] }];
    expect(glbBounds(makeGlb({ ...MESH, accessors, nodes: [{ mesh: 0 }] }))).toBeUndefined();
    expect(glbBounds(makeGlb({ ...MESH, accessors: [{ min: 0, max: {} }], nodes: [{ mesh: 0 }] }))).toBeUndefined();
  });

  it('ignores a node matrix or translation that holds a non-number', () => {
    const matrix = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 'x', 0, 0, 1];
    const nodes = [{ mesh: 0, matrix, translation: [null, 0, 0] }];
    expect(flat(makeGlb({ ...MESH, ...BOX, nodes }))).toEqual([0, 0, 0, 1, 2, 3]);
  });

  it('rejects a GLB whose header version is not 2', () => {
    const bytes = makeGlb({ ...MESH, ...BOX, nodes: [{ mesh: 0 }] });
    new DataView(bytes.buffer).setUint32(4, 1, true);
    expect(glbBounds(bytes)).toBeUndefined();
  });
});
