import type { BufferGeometry } from 'three';
import { addMesh } from '../../shared';
import { merge, part } from '../modelGeometry';
import { staticMount, type FixtureModel } from './ModelContext';

interface Strike4Geometry {
  readonly head: BufferGeometry;
  readonly headTrim: BufferGeometry;
  readonly lens: BufferGeometry;
  readonly stand: BufferGeometry;
}

const CUPS = [
  [-0.23, -0.23],
  [0.23, -0.23],
  [-0.23, 0.23],
  [0.23, 0.23],
] as const;

/** Chauvet STRIKE 4: four round cups on an X-shaped plate, wire grids (lens texture), U-bracket with clamp. */
export const STRIKE4_MODEL: FixtureModel<Strike4Geometry> = {
  geometry: ({ box, cylinder, cylinderX, torusGeo, circleGeo }) => ({
    head: merge([box([0, 0.02, 0], [0.4, 0.26, 0.4]), ...CUPS.map(([x, z]) => cylinder([x, 0, z], 0.2, 0.32))]),
    headTrim: merge(CUPS.map(([x, z]) => part(torusGeo, [x, -0.16, z], [0.19, 0.19, 0.19], [Math.PI / 2, 0, 0]))),
    lens: merge(CUPS.map(([x, z]) => part(circleGeo, [x, -0.165, z], [0.18, 0.18, 1], [Math.PI / 2, 0, 0]))),
    stand: merge([
      ...[-1, 1].map((sx) => box([sx * 0.5, 0.25, 0], [0.04, 0.5, 0.1])),
      box([0, 0.5, 0], [1.04, 0.04, 0.1]),
      cylinder([0, 0.64, 0], 0.045, 0.26),
      ...[-1, 1].map((sx) => cylinderX([sx * 0.53, 0, 0], 0.06, 0.04)),
    ]),
  }),
  build(kit, G, c) {
    const { aim, st } = staticMount(c);
    addMesh(st, G.stand, kit.materials.trim);
    const head = addMesh(aim, G.head, c.bodyMat);
    addMesh(aim, G.headTrim, kit.materials.trim);
    const lens = addMesh(aim, G.lens, c.lensMat);
    return { head, lens, lensOff: 0.17, joints: null, pick: [head] };
  },
};
