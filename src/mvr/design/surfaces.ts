import type { SurfaceBox, Vec3 } from '../../domain/stage/types';
import { boxToThree } from '../math/axes';
import { shiftBox, transformBox, type Aabb } from '../math/Aabb';
import type { MeshPlacement } from '../scene/MvrScene';

/**
 * The world box of one placement in the three frame before the fit offset, or `undefined` when its mesh has no
 * bounds: the mesh is missing or unreadable and already has a warning.
 */
export function placementBox(placement: MeshPlacement, meshBoxes: ReadonlyMap<string, Aabb>): Aabb | undefined {
  const local = meshBoxes.get(placement.file);
  return local ? boxToThree(transformBox(local, placement.matrix)) : undefined;
}

/** The world box of every placement whose mesh has bounds (see `placementBox`); the others are skipped. */
export function placementBoxes(
  placements: readonly MeshPlacement[],
  meshBoxes: ReadonlyMap<string, Aabb>,
): readonly Aabb[] {
  return placements.flatMap((placement) => placementBox(placement, meshBoxes) ?? []);
}

/**
 * The landing surfaces of the placed meshes: each box moved by the fit offset, marked `face: 'top'`. Beams that hit
 * an imported set piece then land on its top, the way they land on the deck, instead of passing through to the ground.
 */
export function topSurfaces(boxes: readonly Aabb[], offset: Vec3): readonly SurfaceBox[] {
  return boxes.map((box) => ({ ...shiftBox(box, offset), face: 'top' }));
}
