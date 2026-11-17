import { makeZip } from './makeZip';

/**
 * Builds a `.mvr` in memory: `sceneXml` becomes `GeneralSceneDescription.xml`, and `extraFiles` (GDTF, meshes) sit
 * next to it at the root, as the MVR spec puts them.
 */
export function makeMvr(sceneXml: string, extraFiles: Readonly<Record<string, Uint8Array | string>> = {}): Uint8Array {
  return makeZip({ 'GeneralSceneDescription.xml': sceneXml, ...extraFiles });
}
