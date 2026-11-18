import { InstancedMesh, Matrix4 } from 'three';
import type { MeshPart } from './MeshPart';

/** Placements of one file, split by whether their matrix mirrors (negative determinant). */
interface Handedness {
  readonly kept: readonly Matrix4[];
  readonly mirrored: readonly Matrix4[];
}

function byHandedness(matrices: readonly Matrix4[]): Handedness {
  return {
    kept: matrices.filter((matrix) => matrix.determinant() >= 0),
    mirrored: matrices.filter((matrix) => matrix.determinant() < 0),
  };
}

function instancedMesh({ geometry, material }: MeshPart, matrices: readonly Matrix4[]): InstancedMesh {
  const mesh = new InstancedMesh(geometry, material, matrices.length);
  matrices.forEach((matrix, index) => mesh.setMatrixAt(index, matrix));
  mesh.instanceMatrix.needsUpdate = true;
  mesh.computeBoundingSphere();
  mesh.receiveShadow = true;
  mesh.castShadow = false;
  return mesh;
}

/**
 * The instanced mesh of mirrored placements. three.js flips the front face per object, by the determinant of the
 * object's world matrix, never per instance; so the mirror moves from the instances to the object. Each instance
 * keeps `X·M` (X mirrors x and is its own inverse) and the object scales by X, so the world matrix is still `M`.
 */
function mirroredMesh(part: MeshPart, matrices: readonly Matrix4[]): InstancedMesh {
  const mirrorX = new Matrix4().makeScale(-1, 1, 1);
  const mesh = instancedMesh(
    part,
    matrices.map((matrix) => mirrorX.clone().multiply(matrix)),
  );
  mesh.scale.x = -1;
  return mesh;
}

/**
 * The `InstancedMesh`es for the parts of a file that several placements share, so 500 identical chairs cost one draw
 * call per sub-mesh instead of 500: one mesh per part for the plain placements and one more for mirrored ones
 * (`mirroredMesh`), so a mirrored copy shows its outside. The meshes share the library's geometry and material;
 * static scenery receives shadows but casts none, which keeps the shadow pass cheap.
 */
export function instancedMeshes(parts: readonly MeshPart[], matrices: readonly Matrix4[]): InstancedMesh[] {
  const { kept, mirrored } = byHandedness(matrices);
  return parts.flatMap((part) => [
    ...(kept.length > 0 ? [instancedMesh(part, kept)] : []),
    ...(mirrored.length > 0 ? [mirroredMesh(part, mirrored)] : []),
  ]);
}
