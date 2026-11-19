import { Matrix4, Texture, type BufferGeometry } from 'three';
import { loadMeshParts } from '../../mvr/loadMeshParts';
import { OfflineLoadingManager } from '../../mvr/OfflineLoadingManager';
import { mergePlain } from './mergePlain';

/** Parses the bytes of one model file into one geometry; undefined when the file holds no triangle. */
export type ParseMesh = (file: string, bytes: Uint8Array) => Promise<BufferGeometry | undefined>;

/**
 * Parses one GDTF model file (GLB or 3DS) with the scenery loaders into one plain geometry in the app frame, node
 * transforms applied. The unit of the result does not matter: `fitMatrix` scales it to the model size. Materials
 * and textures are dropped at once: a body is drawn in the fixture's own material (the textures in CAD-made GDTFs
 * are one generic image, and a per-fixture material is what shows the selection). Embedded GLB images are still
 * decoded by the loader before they are dropped; no request leaves the page for them, because the empty manager
 * maps every URI it does not hold to `data:,` (`OfflineLoadingManager`).
 */
export const parseGdtfMesh: ParseMesh = async (file, bytes) => {
  const parts = await loadMeshParts(file, bytes, new OfflineLoadingManager(new Map()));
  const identity = new Matrix4();
  const merged = mergePlain(parts.map((part) => ({ geometry: part.geometry, matrix: identity })));
  for (const { geometry, material } of parts) {
    geometry.dispose();
    for (const value of Object.values(material)) if (value instanceof Texture) value.dispose();
    material.dispose();
  }
  return merged;
};
