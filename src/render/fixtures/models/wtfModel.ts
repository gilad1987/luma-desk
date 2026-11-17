import type { BufferGeometry } from 'three';
import { addMesh } from '../../shared';
import { merge } from '../modelGeometry';
import { staticMount, type FixtureModel } from './ModelContext';
import { addFlatLens, addRobePanel } from './modelFaces';

interface WtfGeometry {
  readonly base: BufferGeometry;
  readonly baseTrim: BufferGeometry;
  readonly head: BufferGeometry;
  readonly headTrim: BufferGeometry;
}

/** Robe WTF!: wide 2:1 box head between two rounded side towers, base with screen on top. */
export const WTF_MODEL: FixtureModel<WtfGeometry> = {
  geometry: ({ box, cylinderX }) => ({
    base: merge([
      box([0, 0.44, 0], [0.56, 0.12, 0.4]),
      box([0, 0.35, 0], [1.24, 0.07, 0.3]),
      ...[-1, 1].flatMap((sx) => [
        box([sx * 0.57, 0.17, 0], [0.1, 0.36, 0.34]),
        cylinderX([sx * 0.57, 0, 0], 0.17, 0.1),
      ]),
    ]),
    baseTrim: merge([
      ...[-1, 1].map((sx) => box([sx * 0.285, 0.44, 0], [0.02, 0.06, 0.26])),
      ...[-1, 1].map((sx) => cylinderX([sx * 0.63, 0, 0], 0.1, 0.025)),
    ]),
    head: merge([box([0, 0, 0], [1.0, 0.24, 0.48]), box([0, 0.15, 0], [0.88, 0.08, 0.4])]),
    headTrim: merge([
      ...[-1, 1].map((sz) => box([0, -0.125, sz * 0.235], [1.02, 0.035, 0.035])),
      ...[-1, 1].map((sx) => box([sx * 0.495, -0.125, 0], [0.035, 0.035, 0.48])),
      ...[-0.3, 0, 0.3].map((x) => box([x, 0.2, 0], [0.02, 0.02, 0.36])),
    ]),
  }),
  build(kit, G, c) {
    const { aim, st } = staticMount(c);
    const base = addMesh(st, G.base, c.bodyMat);
    addMesh(st, G.baseTrim, kit.materials.trim);
    addRobePanel(kit, c, st, [0.44, 0.201, 0.5, 0.11]);
    const head = addMesh(aim, G.head, c.bodyMat);
    addMesh(aim, G.headTrim, kit.materials.trim);
    const lens = addFlatLens(kit, c, aim, { y: -0.13, width: 0.94, height: 0.42 });
    return { head, lens, lensOff: 0.13, joints: null, pick: [base, head] };
  },
};
