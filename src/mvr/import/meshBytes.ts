import type { MvrArchive } from '../archive/MvrArchive';
import type { MvrImport } from '../MvrImport';
import type { MvrWarning } from '../MvrWarning';
import type { MeshPlacement } from '../scene/MvrScene';
import { meshResources } from './meshResources';

/**
 * The bytes render parses: every mesh file the placements name and the archive holds, by file name, and the files
 * those meshes name in turn (`meshResources`). Render parses the same files the bounds came from, so it needs no
 * second archive reader; a missing mesh file already gave a warning, a missing resource warns through `warn`.
 */
export function meshBytes(
  archive: MvrArchive,
  placements: readonly MeshPlacement[],
  warn: (warning: MvrWarning) => void,
): Pick<MvrImport, 'meshes' | 'meshResources'> {
  const meshes = new Map<string, Uint8Array>();
  for (const file of new Set(placements.map((placement) => placement.file))) {
    const bytes = archive.file(file);
    if (bytes) meshes.set(file, bytes);
  }
  return { meshes, meshResources: meshResources(archive, meshes, warn) };
}
