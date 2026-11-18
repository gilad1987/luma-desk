import type { Vector3 } from 'three';
import { surfacesOf } from '../../domain/stage/surfaces';
import { BUILT_IN_DESIGN } from '../../domain/stage/templates/sultansPool/builtInDesign';
import { SurfaceHit, type BeamHit } from './SurfaceHit';

/** The built-in stage's surfaces, set once here and never changed: this file exposes no way to reach them. */
const builtInSurfaces = new SurfaceHit();
builtInSurfaces.setSurfaces(surfacesOf(BUILT_IN_DESIGN));

// TODO(W3c-cleanup): Stage Builder W3c (plan section 6, writer W3, DEP 4) deletes this file. FixtureVisualSync still
// calls this free function until W3b injects a `SurfaceHit` instance that follows the stage design.
/** Where a fixture beam lands on the built-in stage: `SurfaceHit.hit` over `surfacesOf(BUILT_IN_DESIGN)`. */
export function hitSurface(origin: Vector3, direction: Vector3): BeamHit | null {
  return builtInSurfaces.hit(origin, direction);
}
