import { merge } from '../modelGeometry';
import type { RobeHead } from './robeMover';

/** Robe Spiider: wide, short drum; the front is all honeycomb lens (texture); grooves round the drum. */
export const SPIIDER_HEAD: RobeHead = {
  ax: 0.62,
  lensR: 0.48,
  lensY: 0.3,
  lensOff: 0.305,
  geometry: ({ cylinder, lathe }) => ({
    head: merge([
      lathe(
        [
          [0.5, -0.27],
          [0.52, -0.24],
          [0.525, -0.1],
          [0.52, 0.03],
          [0.49, 0.1],
          [0.41, 0.15],
          [0.24, 0.18],
          [0, 0.19],
        ],
        32,
      ),
    ]),
    headTrim: merge([
      lathe(
        [
          [0.47, -0.305],
          [0.525, -0.305],
          [0.535, -0.29],
          [0.535, -0.25],
          [0.52, -0.24],
        ],
        32,
      ),
      ...[-0.16, -0.12, -0.08].map((y) => cylinder([0, y, 0], 0.53, 0.012)),
    ]),
  }),
};
