import { emptyBox, pointBox, union, type Aabb, type Point3 } from '../math/Aabb';
import type { MeshPlacement } from '../scene/MvrScene';
import { isRigPlacement } from './isRigPlacement';
import { nearFixtures } from './nearFixtures';
import { placementBoxes } from './surfaces';

/**
 * The stage core (three frame, before the fit): the rig parts (`isRigPlacement`) plus the fixtures near any mesh.
 * The hall rule needs a stage to compare each layer with before any layer is judged, and the rig is the part of a
 * file that is never the venue. Far fixtures (front of house) are left out, as they stand in the hall.
 */
export function stageCore(
  placements: readonly MeshPlacement[],
  meshBoxes: ReadonlyMap<string, Aabb>,
  fixtures: readonly Point3[],
): Aabb {
  const allMeshes = placementBoxes(placements, meshBoxes).reduce(union, emptyBox());
  const rig = placementBoxes(placements.filter(isRigPlacement), meshBoxes).reduce(union, emptyBox());
  return nearFixtures(fixtures, allMeshes).map(pointBox).reduce(union, rig);
}
