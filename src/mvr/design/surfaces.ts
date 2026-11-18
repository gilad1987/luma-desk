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
 * The top of each placed mesh's box, moved by the fit offset and marked `face: 'top'`: `MvrGeometry.surfaces`. The
 * render does not land beams on them any more: a box top is not the mesh, so beams meet the real triangles instead
 * (`SurfaceHit.setScenery`). They stay as scene data for code without the parsed meshes.
 */
export function topSurfaces(boxes: readonly Aabb[], offset: Vec3): readonly SurfaceBox[] {
  return boxes.map((box) => ({ ...shiftBox(box, offset), face: 'top' }));
}
