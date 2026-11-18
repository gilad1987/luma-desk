import { Mesh, type BufferGeometry, type Material, type Object3D } from 'three';

/**
 * Whether a node is a mesh, typed with three's base geometry and material: `instanceof Mesh` alone narrows to
 * `Mesh<any, any>`, which would let an unchecked `any` into the code that frees and copies geometries.
 */
export function isMesh(node: Object3D): node is Mesh<BufferGeometry, Material | Material[]> {
  return node instanceof Mesh;
}
