import { InstancedMesh, type Object3D } from 'three';
import { isMesh } from './isMesh';

/**
 * Frees what the stage's meshes own: an instanced mesh its instance buffers, a merged mesh its merged geometry.
 * Shared geometries and all materials belong to the library.
 */
export function disposeOwnMeshes(layer: Object3D): void {
  layer.traverse((node) => {
    if (node instanceof InstancedMesh) node.dispose();
    else if (isMesh(node)) node.geometry.dispose();
  });
}
