/**
 * Owns the material of each 3DS material group when the file does not define one of them: the group without a
 * material is drawn plain, and every later group keeps its own material instead of its neighbour's.
 */
import { MeshPhongMaterial } from 'three';
import { describe, expect, it } from 'vitest';
import { loadMeshParts } from '../../../../src/render/mvr/loadMeshParts';
import { OfflineLoadingManager } from '../../../../src/render/mvr/OfflineLoadingManager';
import { make3dsGroups, type TdsTestMaterial } from '../../../shared/index.ts';

const GHOST: TdsTestMaterial = { name: 'ghost', rgb: [255, 0, 0] };
const BLUE: TdsTestMaterial = { name: 'blue', rgb: [0, 0, 255] };

describe('3DS material groups with an undefined material', () => {
  it('draws the first group plain and the second group in its own material', async () => {
    // two triangles: the first names `ghost`, which has no material entry; the second, 1 m along X, names `blue`
    const bytes = make3dsGroups([GHOST, BLUE], [BLUE]);
    const parts = await loadMeshParts('two.3ds', bytes, new OfflineLoadingManager(new Map()));
    const seen = parts.map(({ geometry, material }) => {
      geometry.computeBoundingBox();
      const colour = material instanceof MeshPhongMaterial ? material.color : undefined;
      return { x: +(geometry.boundingBox?.min.x ?? NaN).toFixed(3), blue: colour ? colour.b > colour.r : undefined };
    });
    expect(seen).toEqual([
      { x: 0, blue: false },
      { x: 1, blue: true },
    ]);
  });

  it.each(['constructor', 'push'])('gives the undefined material named `%s` a stand-in too', async (name) => {
    // the loader keeps materials by name on an array, which inherits members with these names
    const bytes = make3dsGroups([{ name, rgb: [255, 0, 0] }, BLUE], [BLUE]);
    const parts = await loadMeshParts('named.3ds', bytes, new OfflineLoadingManager(new Map()));
    expect(parts.map(({ material }) => material instanceof MeshPhongMaterial)).toEqual([true, true]);
  });
});
