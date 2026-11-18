import { Matrix4, type BufferGeometry, type Material, type Object3D } from 'three';
import { groupGeometry } from './groupGeometry';
import { isMesh } from './isMesh';
import type { MeshPart } from './MeshPart';

/**
 * The parts of one mesh node, before the frame is baked in: the whole geometry with its material, or, for a mesh with
 * a material array (a 3DS mesh with several material groups), one part per `geometry.groups` entry with the material
 * that group names. A group whose material the file does not define draws nothing, as in three.js.
 */
function nodeParts(geometry: BufferGeometry, material: Material | Material[]): MeshPart[] {
  if (!Array.isArray(material)) return [{ geometry: geometry.clone(), material }];
  if (geometry.groups.length === 0) {
    const [first] = material;
    return first ? [{ geometry: geometry.clone(), material: first }] : [];
  }
  return geometry.groups.flatMap(({ start, count, materialIndex }) => {
    const groupMaterial = material[materialIndex ?? 0];
    return groupMaterial ? [{ geometry: groupGeometry(geometry, start, count), material: groupMaterial }] : [];
  });
}

/**
 * The meshes of a loaded file as flat parts: each geometry is copied with its node's world matrix and `frame` baked
 * in, so a placement needs only its own matrix and a glTF that reuses one geometry under two nodes stays correct.
 * Known limit: the matrix is applied to the attribute values, so a glTF with quantized positions
 * (KHR_mesh_quantization, normalized integers) loses precision or clamps; no MVR sample seen so far uses it.
 */
export function meshPartsOf(root: Object3D, frame: Matrix4): MeshPart[] {
  root.updateMatrixWorld(true);
  const parts: MeshPart[] = [];
  root.traverse((node) => {
    if (!isMesh(node)) return;
    const toFile = new Matrix4().multiplyMatrices(frame, node.matrixWorld);
    for (const part of nodeParts(node.geometry, node.material)) {
      parts.push({ geometry: part.geometry.applyMatrix4(toFile), material: part.material });
    }
  });
  return parts;
}
