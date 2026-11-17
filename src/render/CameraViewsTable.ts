import { DECK } from '../domain/venue';

/** A named camera position: eye position, look-at target and an optional lens (default 46 degrees). */
export interface CameraView {
  readonly position: readonly [x: number, y: number, z: number];
  readonly target: readonly [x: number, y: number, z: number];
  readonly fov?: number;
}

/**
 * The view buttons' camera positions. `fohMa` is not a button: FOH resolves to it in the MA layout, where the eye is
 * the operator standing behind the console overlay and the wider lens keeps the whole roof in view.
 */
export const VIEWS: Readonly<Record<string, CameraView>> = {
  foh: { position: [0, 16, 74], target: [0, 9, -8] },
  fohMa: { position: [0, 3.2, 49.5], target: [0, 9.5, -8], fov: 60 },
  front: { position: [0, 6, 28], target: [0, 10, -10] },
  stage: { position: [4, DECK + 1.8, -5], target: [-2, 6, 30] },
  top: { position: [0, 86, -9], target: [0, 0, -9.1] },
  side: { position: [62, 13, -8], target: [0, 9, -8] },
  crowd: { position: [-5, 2.3, 16], target: [0, 13, -10] },
  band: { position: [2.5, 5, 10], target: [0, 3, -9] },
  ring: { position: [0, DECK + 1.7, 3], target: [0, 17, -9.5] },
  walls: { position: [0, 30, 96], target: [0, 14, -20] },
  wide: { position: [-30, 40, 120], target: [0, 6, -5] },
  aud: { position: [0, 15, 1], target: [0, 2, 46] },
  drums: { position: [2.2, DECK + 3.2, -5.5], target: [0, DECK + 1, -12.4] },
  valley: { position: [55, 34, 98], target: [-30, 8, -10] },
  orch: { position: [0, 9, 2], target: [-15.5, 2.4, -12] },
};
