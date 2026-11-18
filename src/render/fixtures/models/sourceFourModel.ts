import type { BufferGeometry } from 'three';
import { addMesh } from '../../shared';
import { merge } from '../modelGeometry';
import { staticMount, type FixtureModel } from './ModelContext';
import { addRoundLens } from './modelFaces';

interface SourceFourGeometry {
  readonly head: BufferGeometry;
  readonly headTrim: BufferGeometry;
  readonly stand: BufferGeometry;
}

/** ETC Source Four: finned lamp housing, shutter barrel with 4 handles, lens tube, frame holder; yoke + C-clamp. */
export const SOURCE_FOUR_MODEL: FixtureModel<SourceFourGeometry> = {
  geometry: ({ box, cylinder, cylinderX, lathe }) => ({
    head: merge([
      lathe([
        [0.14, -0.62],
        [0.15, -0.6],
        [0.15, -0.22],
        [0.21, -0.2],
        [0.21, 0.02],
        [0.25, 0.08],
        [0.25, 0.22],
        [0.2, 0.3],
        [0.1, 0.36],
        [0.1, 0.44],
        [0, 0.45],
      ]),
    ]),
    headTrim: merge([
      ...[0.1, 0.14, 0.18, 0.22].map((y) => cylinder([0, y, 0], 0.265, 0.014)),
      ...[0, 1, 2, 3].map((k) => {
        const a = ((k + 0.5) * Math.PI) / 2;
        return box([Math.sin(a) * 0.26, -0.1, Math.cos(a) * 0.26], [0.03, 0.03, 0.11], [0, a, 0]);
      }),
      ...[-1, 1].map((sz) => box([0, -0.63, sz * 0.165], [0.36, 0.025, 0.03])),
      ...[-1, 1].map((sx) => box([sx * 0.165, -0.63, 0], [0.03, 0.025, 0.36])),
      box([0, 0.5, 0], [0.05, 0.1, 0.05]),
    ]),
    stand: merge([
      ...[-1, 1].map((sx) => box([sx * 0.32, 0.27, 0], [0.035, 0.6, 0.08])),
      box([0, 0.57, 0], [0.675, 0.035, 0.08]),
      ...[-1, 1].map((sx) => cylinderX([sx * 0.36, 0, 0], 0.06, 0.06)),
      box([0, 0.65, 0], [0.1, 0.12, 0.08]),
      cylinder([0, 0.76, 0], 0.025, 0.14),
    ]),
  }),
  build(kit, G, c) {
    const { aim, st } = staticMount(c);
    addMesh(st, G.stand, kit.materials.trim);
    const head = addMesh(aim, G.head, c.bodyMat);
    addMesh(aim, G.headTrim, kit.materials.trim);
    const lens = addRoundLens(kit, c, aim, { y: -0.62, radius: 0.14 });
    return { head, lens, lensOff: 0.64, joints: null, pick: [head] };
  },
};
