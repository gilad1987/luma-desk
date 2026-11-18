import type { MvrArchive } from '../archive/MvrArchive';
import type { MeshPlacement } from '../scene/MvrScene';

/**
 * The bytes of every mesh file the placements name and the archive holds, by file name. Render parses the same
 * files the bounds came from, so it needs no second archive reader; a missing file already gave a warning.
 */
export function meshBytes(archive: MvrArchive, placements: readonly MeshPlacement[]): ReadonlyMap<string, Uint8Array> {
  const meshes = new Map<string, Uint8Array>();
  for (const file of new Set(placements.map((placement) => placement.file))) {
    const bytes = archive.file(file);
    if (bytes) meshes.set(file, bytes);
  }
  return meshes;
}
