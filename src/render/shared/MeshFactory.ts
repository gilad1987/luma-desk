import { Mesh, type BufferGeometry, type Material, type Object3D } from 'three';
import type { Vec3Tuple } from '../../core';

/** Where a new mesh sits in its parent's space; a missing field keeps three's default (origin, no rotation). */
export interface MeshPlacement {
  readonly position?: Vec3Tuple;
  /** Euler angles in radians, XYZ order. */
  readonly rotation?: Vec3Tuple;
}

/**
 * Creates a mesh, places it and adds it to `parent`. It replaces the three legacy helpers (`box`, `add`, `mk`) that
 * differed only in which parent they used and whether they placed the mesh. The parent is an argument, so no builder
 * depends on a hidden scene.
 *
 * The caller creates the geometry before this call, as the legacy helpers did: each three.js object takes a uuid
 * from the seeded `Math.random`, so geometry-then-mesh order is part of render parity.
 */
export function addMesh<TGeometry extends BufferGeometry, TMaterial extends Material | Material[]>(
  parent: Object3D,
  geometry: TGeometry,
  material: TMaterial,
  placement: MeshPlacement = {},
): Mesh<TGeometry, TMaterial> {
  const mesh = new Mesh(geometry, material);
  if (placement.position) mesh.position.set(...placement.position);
  if (placement.rotation) mesh.rotation.set(...placement.rotation);
  parent.add(mesh);
  return mesh;
}
