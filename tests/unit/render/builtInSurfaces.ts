import { surfacesOf } from '../../../src/domain/stage/surfaces';
import { BUILT_IN_DESIGN } from '../../../src/domain/stage/templates/sultansPool/builtInDesign';
import { SurfaceHit } from '../../../src/render/surface/SurfaceHit';

/** The surfaces of the built-in stage in Sultan's Pool, as the stage scene sets them at boot. */
export function builtInSurfaces(): SurfaceHit {
  const surfaces = new SurfaceHit();
  surfaces.setVenue(BUILT_IN_DESIGN.venue.kind);
  surfaces.setSurfaces(surfacesOf(BUILT_IN_DESIGN));
  return surfaces;
}
