import type { MeshPlacement } from '../scene/MvrScene';
import { isScreenPlacement, type ScreenNames } from '../scene/isScreenPlacement';

/**
 * Whether a placed mesh is part of the show's rig: a truss, a fixture body or an LED surface. A rig brings these
 * itself; the venue it plays in never does, so they mark the stage core and keep their layers out of the hall rule.
 */
export function isRigPlacement(placement: ScreenNames & Pick<MeshPlacement, 'kind'>): boolean {
  return placement.kind === 'Truss' || placement.kind === 'Fixture' || isScreenPlacement(placement);
}
