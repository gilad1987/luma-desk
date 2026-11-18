import type { BufferGeometry, Material } from 'three';

/**
 * One drawable piece of a mesh file: a geometry already in the three frame (metres, Y up) of the file, with its
 * material. The library owns both, so instanced meshes share them and only the library disposes them.
 */
export interface MeshPart {
  readonly geometry: BufferGeometry;
  readonly material: Material;
}
