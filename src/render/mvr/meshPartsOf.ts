import { Matrix4, type Object3D } from 'three';
import { isMesh } from './isMesh';
import type { MeshPart } from './MeshPart';

/**
 * The meshes of a loaded file as flat parts: each geometry is cloned with its node's world matrix and `frame` baked
 * in, so a placement needs only its own matrix and a glTF that reuses one geometry under two nodes stays correct. A
 * mesh with a material array keeps its first material, because the loaders give one per mesh in practice.
 */
export function meshPartsOf(root: Object3D, frame: Matrix4): MeshPart[] {
  root.updateMatrixWorld(true);
  const parts: MeshPart[] = [];
  root.traverse((node) => {
    if (!isMesh(node)) return;
    const material = Array.isArray(node.material) ? node.material[0] : node.material;
    if (!material) return;
    const toFile = new Matrix4().multiplyMatrices(frame, node.matrixWorld);
    parts.push({ geometry: node.geometry.clone().applyMatrix4(toFile), material });
  });
  return parts;
}
