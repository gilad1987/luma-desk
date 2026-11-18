import { merge } from '../modelGeometry';
import type { RobeHead } from './robeMover';

/** Robe FORTE: long barrel, wider body around the tilt axis, ribbed rear underside, stepped bezel round the lens. */
export const FORTE_HEAD: RobeHead = {
  ax: 0.43,
  lensR: 0.235,
  lensY: 0.772,
  lensOff: 0.78,
  geometry: ({ box, cylinder, lathe }, fs) => ({
    head: merge([
      lathe([
        [0.26, -0.72],
        [0.3, -0.7],
        [0.3, -0.42],
        [0.315, -0.3],
        [0.33, -0.15],
        [0.335, 0.05],
        [0.33, 0.2],
        [0.31, 0.32],
        [0.27, 0.4],
        [0.18, 0.44],
        [0, 0.45],
      ]),
    ]),
    headTrim: merge([
      lathe([
        [0.235, -0.78],
        [0.3, -0.78],
        [0.3, -0.765],
        [0.325, -0.755],
        [0.325, -0.69],
        [0.305, -0.68],
      ]),
      ...[0.12, 0.17, 0.22, 0.27].map((y) => cylinder([0, y, 0], 0.345, 0.014)),
      // FORTE FS: the RoboSpot camera on top of the barrel, next to the lens
      ...(fs
        ? [
            box([-0.13, -0.5, 0.4], [0.12, 0.26, 0.12]),
            cylinder([-0.13, -0.645, 0.4], 0.045, 0.04),
            box([-0.13, -0.47, 0.345], [0.06, 0.1, 0.03]),
          ]
        : []),
    ]),
  }),
};
