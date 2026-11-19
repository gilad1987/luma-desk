/**
 * Owns the faces of a mesh file that name no material. The 3DS loader gives a mesh whose material table misses an
 * entry an empty material array with one group; that mesh is still the real housing or truss, so it must be drawn.
 */
import { BoxGeometry, Matrix4, Mesh, MeshPhongMaterial, type Material } from 'three';
import { describe, expect, it } from 'vitest';
import type { MeshPart } from '../../../../src/render/mvr/MeshPart';
import { meshPartsOf } from '../../../../src/render/mvr/meshPartsOf';

const corners = (parts: readonly MeshPart[]): number =>
  parts.reduce((sum, part) => sum + (part.geometry.index?.count ?? 0), 0);

/** A box as the 3DS loader leaves it: `materials` in its array, one group per entry of `groups`. */
function loaderMesh(materials: Material[], groups: readonly (readonly [number, number, number])[]): Mesh {
  const geometry = new BoxGeometry(1, 2, 3);
  geometry.clearGroups();
  for (const [start, count, materialIndex] of groups) geometry.addGroup(start, count, materialIndex);
  return new Mesh(geometry, materials);
}

describe('meshPartsOf on faces without a material', () => {
  it('keeps the whole mesh of a material group the file does not define', () => {
    const parts = meshPartsOf(loaderMesh([], [[0, 36, 0]]), new Matrix4());
    expect(corners(parts)).toBe(36);
    expect(parts[0]?.material).toBeInstanceOf(MeshPhongMaterial);
  });

  it('keeps the defined material, and shares one plain material between the undefined groups and the tail', () => {
    const red = new MeshPhongMaterial({ color: 0xff0000 });
    // 12 corners in red, 12 in a material the file lacks, and 12 after the last group
    const parts = meshPartsOf(
      loaderMesh(
        [red],
        [
          [0, 12, 0],
          [12, 12, 1],
        ],
      ),
      new Matrix4(),
    );
    expect(corners(parts)).toBe(36);
    expect(parts[0]?.material).toBe(red);
    expect(parts[1]?.material).not.toBe(red);
    expect(parts[2]?.material).toBe(parts[1]?.material);
  });
});
