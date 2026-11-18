import { InstancedMesh, type Matrix4 } from 'three';
import type { MeshPart } from './MeshPart';

/**
 * One `InstancedMesh` per part of a file that several placements share, so 500 identical chairs cost one draw call
 * per sub-mesh instead of 500. The meshes share the library's geometry and material; static scenery receives
 * shadows but casts none, which keeps the shadow pass cheap.
 */
export function instancedMeshes(parts: readonly MeshPart[], matrices: readonly Matrix4[]): InstancedMesh[] {
  return parts.map(({ geometry, material }) => {
    const mesh = new InstancedMesh(geometry, material, matrices.length);
    matrices.forEach((matrix, index) => mesh.setMatrixAt(index, matrix));
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
    mesh.receiveShadow = true;
    mesh.castShadow = false;
    return mesh;
  });
}
