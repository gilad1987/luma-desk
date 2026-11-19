import { merge } from '../modelGeometry';
import type { ProfilePoint } from '../ModelPrimitives';
import type { RobeHead } from './robeMover';

/** The Spiider drum, front to rear: wide and short; the `mover` family scales it (`families/moverReferences.ts`). */
export const SPIIDER_DRUM_PROFILE: readonly ProfilePoint[] = [
  [0.5, -0.27],
  [0.52, -0.24],
  [0.525, -0.1],
  [0.52, 0.03],
  [0.49, 0.1],
  [0.41, 0.15],
  [0.24, 0.18],
  [0, 0.19],
];

/** The Spiider front bezel round the honeycomb lens; the family scales it. */
export const SPIIDER_BEZEL_PROFILE: readonly ProfilePoint[] = [
  [0.47, -0.305],
  [0.525, -0.305],
  [0.535, -0.29],
  [0.535, -0.25],
  [0.52, -0.24],
];

/** Lathe segments of the Spiider drum and bezel (a wide drum needs more than the default to look round). */
export const SPIIDER_SEGMENTS = 32;

/** Robe Spiider: wide, short drum; the front is all honeycomb lens (texture); grooves round the drum. */
export const SPIIDER_HEAD: RobeHead = {
  ax: 0.62,
  lensR: 0.48,
  lensY: 0.3,
  lensOff: 0.305,
  geometry: ({ cylinder, lathe }) => ({
    head: merge([lathe(SPIIDER_DRUM_PROFILE, SPIIDER_SEGMENTS)]),
    headTrim: merge([
      lathe(SPIIDER_BEZEL_PROFILE, SPIIDER_SEGMENTS),
      ...[-0.16, -0.12, -0.08].map((y) => cylinder([0, y, 0], 0.53, 0.012)),
    ]),
  }),
};
