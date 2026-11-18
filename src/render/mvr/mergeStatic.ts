import { Mesh, type BufferGeometry, type Material, type Matrix4 } from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { flipWinding } from './flipWinding';
import type { MeshPart } from './MeshPart';

/** A file placed once, with the parts to draw there. */
export interface SinglePlacement {
  readonly parts: readonly MeshPart[];
  readonly matrix: Matrix4;
}

interface MergeGroup {
  readonly material: Material;
  readonly geometries: BufferGeometry[];
}

/**
 * Geometries merge only with the same material and the same attribute layout, which `mergeGeometries` requires. The
 * library pools materials that look alike, so the material instance is the right key across files.
 */
function mergeKey({ geometry, material }: MeshPart): string {
  const attributes = Object.entries(geometry.attributes).map(([name, attribute]) => `${name}:${attribute.itemSize}`);
  return `${material.uuid}|${geometry.index ? 'indexed' : 'flat'}|${attributes.sort().join(',')}`;
}

function staticMesh(geometry: BufferGeometry, material: Material): Mesh {
  const mesh = new Mesh(geometry, material);
  mesh.receiveShadow = true;
  mesh.castShadow = false;
  return mesh;
}

/** One mesh per group, or one per geometry when three cannot merge them (for example differing morph targets). */
function meshesOf({ material, geometries }: MergeGroup): Mesh[] {
  const merged = geometries.length > 1 ? mergeGeometries(geometries) : geometries[0];
  if (!merged) return geometries.map((geometry) => staticMesh(geometry, material));
  if (merged !== geometries[0]) geometries.forEach((geometry) => geometry.dispose());
  return [staticMesh(merged, material)];
}

/**
 * The files placed once, merged into one mesh per material in world space, so a set of 300 distinct props costs a
 * draw call per material, not per prop. The meshes own their merged geometries; materials stay the library's.
 * Static scenery receives shadows but casts none, which keeps the shadow pass cheap. A mirrored placement gets its
 * winding reversed (`flipWinding`), since a baked mirror leaves no object matrix for the renderer to flip by.
 */
export function mergeStatic(placements: readonly SinglePlacement[]): Mesh[] {
  const groups = new Map<string, MergeGroup>();
  for (const { parts, matrix } of placements) {
    for (const part of parts) {
      const key = mergeKey(part);
      const group = groups.get(key) ?? { material: part.material, geometries: [] };
      const placed = part.geometry.clone().applyMatrix4(matrix);
      if (matrix.determinant() < 0) flipWinding(placed);
      group.geometries.push(placed);
      groups.set(key, group);
    }
  }
  return [...groups.values()].flatMap(meshesOf);
}
