import type { StageDesign } from '../../../src/domain/stage/StageDesign.ts';
import { MvrArchive } from '../../../src/mvr/archive/MvrArchive.ts';
import { exportMvr } from '../../../src/mvr/index.ts';
import { shiftBox, transformBox, type Aabb } from '../../../src/mvr/math/Aabb.ts';
import { boxToThree } from '../../../src/mvr/math/axes.ts';
import { meshBounds } from '../../../src/mvr/mesh/meshBounds.ts';
import { walkScene } from '../../../src/mvr/scene/walkScene.ts';
import { parseXml } from '../../../src/mvr/xml/parseXml.ts';
import { exportRoundTrip } from './exportRoundTrip.ts';

/**
 * The world box (three frame, fitted) of every exported body by object uuid, from the import's own mesh bounds and
 * the scene's placement matrices. The desk drops its own meshes on import, so the boxes come from the scene as
 * another console reads it, with the offset the import fitted.
 */
export async function exportedBoxes(design: StageDesign): Promise<ReadonlyMap<string, Aabb>> {
  const { meshes, result } = await exportRoundTrip(design);
  const archive = MvrArchive.open(exportMvr(design, { meshes }).bytes);
  const { placements } = walkScene(parseXml(archive.text('GeneralSceneDescription.xml') ?? ''));
  const boxes = new Map<string, Aabb>();
  for (const placement of placements) {
    const local = meshBounds(archive, placement.file, () => undefined);
    if (!local) throw new Error(`exportedBoxes: ${placement.file} has no bounds`);
    boxes.set(placement.uuid, shiftBox(boxToThree(transformBox(local, placement.matrix)), result.geometry.offset));
  }
  return boxes;
}
