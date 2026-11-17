import { describe, expect, it } from 'vitest';
import { glbBounds } from '../../../src/mvr/mesh/glbBounds.ts';
import { makeGlb } from '../../shared/index.ts';

const MESH = { meshes: [{ primitives: [{ attributes: { POSITION: 0 } }] }] };
const ACCESSORS = { accessors: [{ min: [0, 0, 0], max: [1, 2, 3] }] };
const HALF = Math.SQRT1_2;

const bounds = (nodes: object[], extra: object = {}): readonly number[] | undefined => {
  const box = glbBounds(makeGlb({ ...MESH, ...ACCESSORS, nodes, ...extra }));
  return box && [...box.min, ...box.max].map((v) => Math.round(v * 1e9) / 1e9 + 0);
};

describe('glbBounds', () => {
  it('reads the POSITION accessor min/max of a root node', () => {
    expect(bounds([{ mesh: 0 }])).toEqual([0, 0, 0, 1, 2, 3]);
  });

  it('applies a node matrix (column-major)', () => {
    const matrix = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 5, 6, 7, 1];
    expect(bounds([{ mesh: 0, matrix }])).toEqual([5, 6, 7, 6, 8, 10]);
  });

  it('applies translation, rotation and scale as T·R·S', () => {
    const node = { mesh: 0, translation: [10, 0, 0], rotation: [0, HALF, 0, HALF], scale: [2, 1, 1] };
    expect(bounds([node])).toEqual([10, 0, -2, 13, 2, 0]);
  });

  it('composes child nodes with their parent', () => {
    const nodes = [
      { translation: [0, 100, 0], children: [1] },
      { mesh: 0, translation: [1, 0, 0] },
    ];
    expect(bounds(nodes)).toEqual([1, 100, 0, 2, 102, 3]);
  });

  it('uses the default scene roots when scenes are given', () => {
    const nodes = [{ mesh: 0 }, { mesh: 0, translation: [50, 0, 0] }];
    expect(bounds(nodes, { scene: 0, scenes: [{ nodes: [1] }] })).toEqual([50, 0, 0, 51, 2, 3]);
  });

  it('survives a node cycle', () => {
    expect(bounds([{ mesh: 0, children: [1] }, { children: [0] }], { scenes: [{ nodes: [0] }] })).toEqual([
      0, 0, 0, 1, 2, 3,
    ]);
  });

  it('gives undefined for bytes that are not GLB or hold no mesh', () => {
    expect(glbBounds(new Uint8Array([1, 2, 3]))).toBeUndefined();
    expect(bounds([{}])).toBeUndefined();
  });
});
