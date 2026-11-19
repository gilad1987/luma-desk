import type { MeshCache } from '../gdtf/gdtfMeshBox';
import type { MvrWarning } from '../MvrWarning';

/**
 * A `bad-mesh` warning for each GDTF model file the size step could not parse, worded as the scene mesh reader words
 * it (`meshBounds`). `meshes` holds the unpacked model files by `meshKey`, so the warning names the GDTF file too.
 */
export function badModelWarnings(meshes: ReadonlyMap<string, Uint8Array>, cache: MeshCache): MvrWarning[] {
  return [...meshes]
    .filter(([, bytes]) => cache.bad.has(bytes))
    .map(([file]) => ({ code: 'bad-mesh', message: `The mesh file ${file} could not be read.`, ref: file }));
}
