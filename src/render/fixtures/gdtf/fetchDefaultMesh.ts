import type { DefaultMeshSource } from './DefaultShapes';

/** The folder of the default meshes in the shipped app (`public/gdtf-meshes`, see `docs/gdtf-default-meshes.md`). */
const FOLDER = 'gdtf-meshes/';

/**
 * Reads a default mesh of the GDTF specification from the app's own files. The service worker caches the folder at
 * install with the rest of the app, so it is there offline. The URL is relative to the page, as the worker's list is,
 * so it works under a sub-path. Undefined when the file cannot be read: the part is then drawn as the box of its shape.
 */
export const fetchDefaultMesh: DefaultMeshSource = async (file) => {
  try {
    const response = await fetch(new URL(FOLDER + file, document.baseURI));
    return response.ok ? new Uint8Array(await response.arrayBuffer()) : undefined;
  } catch {
    return undefined;
  }
};
