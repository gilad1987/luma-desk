import { Matrix4 } from 'three';
import { mvrToThreeMatrix } from '../../mvr/index';
import type { MeshPart } from './MeshPart';
import { meshPartsOf } from './meshPartsOf';

/** The archive name forms the import reads: `.glb` is glTF, `.3ds` or no extension is 3DS (see the import's bounds). */
function formatOf(file: string): 'glb' | '3ds' | undefined {
  const name = file.toLowerCase();
  if (name.endsWith('.glb')) return 'glb';
  return !/\.[^.]*$/.test(name) || name.endsWith('.3ds') ? '3ds' : undefined;
}

/**
 * Parses one mesh file into parts in the three frame. The loaders are imported on first use, so a show without MVR
 * scenery never downloads them. glTF is already metres, Y up; a 3DS mesh (millimetres, Z up) gets C baked in. Any
 * other extension gives no parts: the import already warned about it.
 */
export async function loadMeshParts(file: string, bytes: Uint8Array): Promise<MeshPart[]> {
  const buffer = bytes.slice().buffer;
  switch (formatOf(file)) {
    case 'glb': {
      const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
      const gltf = await new GLTFLoader().parseAsync(buffer, '');
      return meshPartsOf(gltf.scene, new Matrix4());
    }
    case '3ds': {
      const { TDSLoader } = await import('three/examples/jsm/loaders/TDSLoader.js');
      return meshPartsOf(new TDSLoader().parse(buffer, ''), new Matrix4().fromArray(mvrToThreeMatrix()));
    }
    case undefined:
      return [];
  }
}
