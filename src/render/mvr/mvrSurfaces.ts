import { surfacesOf } from '../../domain/stage/surfaces';
import type { StageDesign } from '../../domain/stage/StageDesign';
import type { SurfaceBox } from '../../domain/stage/types';

/**
 * The boxes beams land on for an imported stage: the design's own deck, risers and screens, and nothing of the MVR
 * meshes. A mesh used to add the top of its bounding box here, which put a floor pool in the air over a truss and
 * let every level or upward beam pass through walls and drapes. Beams now meet the real triangles of the shown
 * layers (`SurfaceHit.setScenery`), so a box per mesh would only block them at the wrong place.
 */
export function mvrSurfaces(design: StageDesign): SurfaceBox[] {
  return [...surfacesOf(design)];
}
