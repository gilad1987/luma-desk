import type { MvrArchive } from '../archive/MvrArchive';
import type { Aabb } from '../math/Aabb';
import { meshBounds } from '../mesh/meshBounds';
import type { MvrWarning } from '../MvrWarning';
import type { MeshPlacement } from '../scene/MvrScene';

/** Local bounds of every distinct mesh file; a file that cannot be read gets no entry and a warning. */
export function readMeshBoxes(
  archive: MvrArchive,
  placements: readonly MeshPlacement[],
  warn: (warning: MvrWarning) => void,
): ReadonlyMap<string, Aabb> {
  const boxes = new Map<string, Aabb>();
  for (const file of new Set(placements.map((placement) => placement.file))) {
    const box = meshBounds(archive, file, warn);
    if (box) boxes.set(file, box);
  }
  return boxes;
}
