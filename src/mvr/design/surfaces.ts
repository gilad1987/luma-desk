import type { SurfaceBox, Vec3 } from '../../domain/stage/types';
import { boxToThree } from '../math/axes';
import { shiftBox, transformBox, type Aabb } from '../math/Aabb';
import type { MeshPlacement } from '../scene/MvrScene';

/**
 * The world box of every placement whose mesh has bounds, in the three frame before the fit offset. Placements
 * without bounds are skipped: their mesh is missing or unreadable and already has a warning.
 */
export function placementBoxes(
  placements: readonly MeshPlacement[],
  meshBoxes: ReadonlyMap<string, Aabb>,
): readonly Aabb[] {
  return placements.flatMap((placement) => {
    const local = meshBoxes.get(placement.file);
    return local ? [boxToThree(transformBox(local, placement.matrix))] : [];
  });
}

/**
 * The landing surfaces of the placed meshes: each box moved by the fit offset, marked `face: 'top'`. Beams that hit
 * an imported set piece then land on its top, the way they land on the deck, instead of passing through to the ground.
 */
export function topSurfaces(boxes: readonly Aabb[], offset: Vec3): readonly SurfaceBox[] {
  return boxes.map((box) => ({ ...shiftBox(box, offset), face: 'top' }));
}
