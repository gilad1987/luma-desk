import type { Scene, Texture } from 'three';
import type { BeamPassContext } from '../beams/BeamPass';
import type { LightBatch } from './LightBatch';

/**
 * What the post chain gives the surface light: the beam pass context, the scene for the surface buffers, and the
 * ambient occlusion image of the frame, which shades the bounce.
 */
export interface SurfaceLightContext extends BeamPassContext {
  readonly scene: Scene;
  readonly occlusion: Texture;
}

/**
 * What the surface light takes from the beams. The rows are the beam batch's own row objects, so a beam is packed
 * once; the gobo sheet is the one of the beam pass of the same chain (`goboSheetOf`), which owns and frees it, so
 * `createSurfaceLightPass` passes it with `ownsSheet` false.
 */
export interface BeamSource {
  /** The lights of the frame; the fixture sync fills it (`surfaceLight.batch`). */
  readonly rows: LightBatch;
  /** The gobo sheet, 4 x 2 cells. */
  readonly goboSheet: Texture;
  /** Whether the surface light frees the sheet with itself. */
  readonly ownsSheet: boolean;
}
