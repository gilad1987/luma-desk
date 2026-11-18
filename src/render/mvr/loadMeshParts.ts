import { Matrix4, Texture, type LoadingManager, type Material } from 'three';
import { meshFormatOf, mvrToThreeMatrix } from '../../mvr/index';
import type { MeshPart } from './MeshPart';
import { meshPartsOf } from './meshPartsOf';

/**
 * Drops the texture maps of a 3DS material. They name image files the archive does not hand to render, so they never
 * load, and a map without an image would draw the part black instead of in its material colour.
 */
function removeTextures(material: Material): void {
  for (const [key, value] of Object.entries(material)) {
    if (!(value instanceof Texture)) continue;
    value.dispose();
    // `Material` declares no map fields; each subclass has its own, so the key found above is set by reflection.
    Reflect.set(material, key, null);
  }
}

/** Parses a GLB; the files it names load through `manager`. */
async function parseGlb(buffer: ArrayBuffer, manager: LoadingManager): Promise<MeshPart[]> {
  const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
  const gltf = await new GLTFLoader(manager).parseAsync(buffer, '');
  return meshPartsOf(gltf.scene, new Matrix4());
}

/**
 * Parses one mesh file into parts in the three frame. The loaders are imported on first use, so a show without MVR
 * scenery never downloads them. Every file named inside a mesh loads through `manager`, the import's
 * `OfflineLoadingManager`, so it is never fetched: a glTF gets its files from the archive and a 3DS texture is
 * dropped. glTF is already metres, Y up; a 3DS mesh (millimetres, Z up) gets C baked in. Any other extension gives
 * no parts: the import already warned about it. A file the loader cannot parse rejects.
 */
export async function loadMeshParts(file: string, bytes: Uint8Array, manager: LoadingManager): Promise<MeshPart[]> {
  const buffer = bytes.slice().buffer;
  switch (meshFormatOf(file)) {
    case 'glb':
      return parseGlb(buffer, manager);
    case '3ds': {
      const { TDSLoader } = await import('three/examples/jsm/loaders/TDSLoader.js');
      const root = new TDSLoader(manager).parse(buffer, '');
      const parts = meshPartsOf(root, new Matrix4().fromArray(mvrToThreeMatrix()));
      parts.forEach((part) => removeTextures(part.material));
      return parts;
    }
    case undefined:
      return [];
  }
}
