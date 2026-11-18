import { Matrix4, Texture, type Material } from 'three';
import { meshFormatOf, mvrToThreeMatrix } from '../../mvr/index';
import { archiveTexturePlugin } from './archiveTexturePlugin';
import type { MeshPart } from './MeshPart';
import { meshPartsOf } from './meshPartsOf';
import { OfflineLoadingManager } from './OfflineLoadingManager';

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

/**
 * Parses a GLB; the files it names load through `manager`, and a texture whose file the archive lacks is skipped
 * (`archiveTexturePlugin`).
 */
async function parseGlb(buffer: ArrayBuffer, manager: OfflineLoadingManager): Promise<MeshPart[]> {
  const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
  const loader = new GLTFLoader(manager).register((parser) => archiveTexturePlugin(parser, manager));
  const gltf = await loader.parseAsync(buffer, '');
  return meshPartsOf(gltf.scene, new Matrix4());
}

/**
 * Parses one mesh file into parts in the three frame. The loaders are imported on first use, so a show without MVR
 * scenery never downloads them. No file named inside a mesh is fetched: a glTF gets its files from the archive
 * through `manager`, the import's `OfflineLoadingManager`. A 3DS mesh gets a manager without archive files, because
 * its texture maps are dropped and an archive image would be decoded for nothing. glTF is already metres, Y up; a
 * 3DS mesh (millimetres, Z up) gets C baked in. Any other extension gives no parts: the import already warned about
 * it. A file the loader cannot parse rejects.
 */
export async function loadMeshParts(
  file: string,
  bytes: Uint8Array,
  manager: OfflineLoadingManager,
): Promise<MeshPart[]> {
  const buffer = bytes.slice().buffer;
  switch (meshFormatOf(file)) {
    case 'glb':
      return parseGlb(buffer, manager);
    case '3ds': {
      const { TDSLoader } = await import('three/examples/jsm/loaders/TDSLoader.js');
      const root = new TDSLoader(new OfflineLoadingManager(new Map())).parse(buffer, '');
      const parts = meshPartsOf(root, new Matrix4().fromArray(mvrToThreeMatrix()));
      parts.forEach((part) => removeTextures(part.material));
      return parts;
    }
    case undefined:
      return [];
  }
}
