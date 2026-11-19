import { goboSheetOf } from '../beams/createBeamPass';
import type { SurfaceLightContext } from './BeamSource';
import { LightBatch } from './LightBatch';
import { SurfaceLightPass } from './SurfaceLightPass';

/**
 * Creates the surface light pass of an MVR stage. Its cookies come from the gobo sheet of the beam pass of the
 * same chain, which owns that texture and frees it, so a shaft and its pool show one drawing.
 */
export function createSurfaceLightPass(context: SurfaceLightContext): SurfaceLightPass {
  return new SurfaceLightPass(context, { rows: new LightBatch(), goboSheet: goboSheetOf(context), ownsSheet: false });
}
