import type { MvrArchive } from '../archive/MvrArchive';
import type { Aabb } from '../math/Aabb';
import { isPanelShape } from '../scene/isPanelShape';
import type { MvrScene } from '../scene/MvrScene';
import { readGdtfTable } from './gdtfTable';

/**
 * The scene with the two facts `isScreenPlacement` needs beyond the names, which only the import can find: whether
 * the object's own GDTF holds a `Display` geometry, and whether the mesh is a standing panel where it is placed. The
 * scene walk reads the XML alone, so neither is known before the GDTF files and the mesh bounds are read. A mesh
 * without bounds (a file the import could not read) is no panel: nothing of it is drawn. Problems of an object's
 * GDTF file are not reported here, because the desk reads nothing else from it.
 */
export function withScreenEvidence(scene: MvrScene, boxes: ReadonlyMap<string, Aabb>, archive: MvrArchive): MvrScene {
  const specs = [...new Set(scene.placements.flatMap((placement) => placement.gdtfSpec ?? []))];
  const infos = specs.length === 0 ? undefined : readGdtfTable(archive, specs).infos;
  const placements = scene.placements.map((placement) => {
    const box = boxes.get(placement.file);
    const info = placement.gdtfSpec === undefined ? undefined : infos?.get(placement.gdtfSpec);
    const panel = box !== undefined && isPanelShape(box, placement.matrix);
    return { ...placement, display: info?.hasDisplay === true, panel };
  });
  return { ...scene, placements };
}
