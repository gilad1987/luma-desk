import type { BufferGeometry } from 'three';
import { addMesh } from '../../shared';
import { merge } from '../modelGeometry';
import { staticMount, type FixtureModel } from './ModelContext';
import { addRoundLens } from './modelFaces';

interface ParfectGeometry {
  readonly head: BufferGeometry;
  readonly headTrim: BufferGeometry;
  readonly doors: BufferGeometry;
  readonly stand: BufferGeometry;
}

/** Robe ParFect 150: cylinder with cooling rings, rear handle, 4-leaf barndoor, U-bracket (a stand on the deck). */
export const PARFECT_MODEL: FixtureModel<ParfectGeometry> = {
  geometry: ({ box, cylinder, cylinderX, lathe }) => ({
    head: merge([
      lathe([
        [0.33, -0.45],
        [0.34, -0.42],
        [0.34, 0.2],
        [0.31, 0.32],
        [0.22, 0.38],
        [0, 0.39],
      ]),
    ]),
    headTrim: merge([
      lathe([
        [0.29, -0.475],
        [0.355, -0.475],
        [0.355, -0.43],
        [0.34, -0.42],
      ]),
      ...[0, 0.05, 0.1, 0.15].map((y) => cylinder(0, y, 0, 0.35, 0.018)),
      box(0, 0.45, 0, 0.05, 0.05, 0.36),
      ...[-1, 1].map((sz) => box(0, 0.41, sz * 0.16, 0.05, 0.07, 0.05)),
    ]),
    doors: merge([
      ...[-1, 1].map((sz) => box(0, -0.61, sz * 0.42, 0.62, 0.3, 0.015, -sz * 0.44, 0, 0)),
      ...[-1, 1].map((sx) => box(sx * 0.42, -0.61, 0, 0.015, 0.3, 0.55, 0, 0, sx * 0.44)),
    ]),
    stand: merge([
      ...[-1, 1].map((sx) => box(sx * 0.4, 0.23, 0, 0.035, 0.46, 0.14)),
      box(0, 0.46, 0, 0.835, 0.035, 0.14),
      ...[-1, 1].map((sx) => cylinderX(sx * 0.43, 0, 0, 0.07, 0.05)),
    ]),
  }),
  build(kit, G, c) {
    const { aim, st } = staticMount(c);
    addMesh(st, G.stand, kit.materials.trim);
    const head = addMesh(aim, G.head, c.bodyMat);
    addMesh(aim, G.headTrim, kit.materials.trim);
    addMesh(aim, G.doors, kit.materials.alu);
    const lens = addRoundLens(kit, c, aim, -0.47, 0.29);
    return { head, lens, lensOff: 0.48, joints: null, pick: [head] };
  },
};
