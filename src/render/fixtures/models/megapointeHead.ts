import { merge } from '../modelGeometry';
import type { RobeHead } from './robeMover';

/** Robe MegaPointe: short, fat head; deep lens inside a thick front ring; vent grilles on the head sides. */
export const MEGAPOINTE_HEAD: RobeHead = {
  ax: 0.51,
  lensR: 0.27,
  lensY: 0.445,
  lensOff: 0.53,
  geometry: ({ box, lathe }) => ({
    head: merge([
      lathe([
        [0.36, -0.4],
        [0.4, -0.37],
        [0.41, -0.2],
        [0.41, 0.1],
        [0.39, 0.24],
        [0.33, 0.33],
        [0.2, 0.37],
        [0, 0.38],
      ]),
    ]),
    // the ring, then its inner wall (listed rear to front, so its faces point inward)
    headTrim: merge([
      lathe([
        [0.27, -0.53],
        [0.4, -0.53],
        [0.42, -0.5],
        [0.42, -0.4],
        [0.4, -0.37],
      ]),
      lathe([
        [0.27, -0.44],
        [0.27, -0.53],
      ]),
    ]),
    vents: merge([box([0, 0.06, 0.405], [0.3, 0.26, 0.02]), box([0, 0.06, -0.405], [0.3, 0.26, 0.02])]),
  }),
};
