/**
 * The mesh file name of an exported shape depends on the shape, not on how it was built: key order and float noise
 * below 0.1 mm give one file, so equal bodies share it; a real 1 mm difference gives another.
 */
import { describe, expect, it } from 'vitest';
import { meshFileOf, type MeshShape } from '../../../../src/mvr/export/MeshShape.ts';

const deck: MeshShape = { kind: 'deck', size: [0.3, 1.8, 16] };

describe('meshFileOf', () => {
  it('names a shape the same whatever its key order', () => {
    const reordered: MeshShape = { size: [0.3, 1.8, 16], kind: 'deck' };
    const truss: MeshShape = {
      kind: 'truss',
      params: { kind: 'straight', a: [-14, 0, 0], b: [14, 0, 0], section: 0.52 },
    };
    const trussReordered: MeshShape = {
      params: { section: 0.52, b: [14, 0, 0], a: [-14, 0, 0], kind: 'straight' },
      kind: 'truss',
    };
    expect(meshFileOf(reordered)).toBe(meshFileOf(deck));
    expect(meshFileOf(trussReordered)).toBe(meshFileOf(truss));
  });

  it('names a shape the same under float noise and apart for a 1 mm change', () => {
    expect(meshFileOf({ kind: 'deck', size: [0.1 + 0.2, 1.8, 16.000000001] })).toBe(meshFileOf(deck));
    expect(meshFileOf({ kind: 'deck', size: [0.301, 1.8, 16] })).not.toBe(meshFileOf(deck));
  });

  it('keeps the name a valid luma mesh file name', () => {
    expect(meshFileOf(deck)).toMatch(/^luma_deck_[0-9a-f]{12}\.glb$/);
  });
});
