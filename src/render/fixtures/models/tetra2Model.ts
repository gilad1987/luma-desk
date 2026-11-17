import { Group, type BufferGeometry } from 'three';
import { addMesh } from '../../shared';
import { merge } from '../modelGeometry';
import type { FixtureModel } from './ModelContext';
import { addFlatLens, addRobePanel } from './modelFaces';

interface Tetra2Geometry {
  readonly base: BufferGeometry;
  readonly baseTrim: BufferGeometry;
  readonly head: BufferGeometry;
  readonly headTrim: BufferGeometry;
}

/** Robe Tetra2: long base with screen and vents, two end pivots, a tilting bar head with 18 cells (no pan). */
export const TETRA2_MODEL: FixtureModel<Tetra2Geometry> = {
  geometry: ({ box, cylinderX }) => ({
    base: merge([
      box(0, 0.2, 0, 1.0, 0.1, 0.14),
      ...[-1, 1].flatMap((sx) => [box(sx * 0.475, 0.08, 0, 0.05, 0.2, 0.12), cylinderX(sx * 0.475, 0, 0, 0.06, 0.05)]),
    ]),
    baseTrim: merge([
      ...[-1, 1].flatMap((sx) => [-1, 1].map((sz) => box(sx * 0.42, 0.257, sz * 0.045, 0.06, 0.015, 0.03))),
      ...[-1, 1].map((sx) => box(sx * 0.3, 0.2, 0.071, 0.2, 0.07, 0.004)),
    ]),
    head: merge([box(0, 0, 0, 0.9, 0.1, 0.13), box(0, 0.06, 0, 0.86, 0.03, 0.1)]),
    headTrim: merge([
      ...[-1, 1].map((sz) => box(0, -0.05, sz * 0.064, 0.9, 0.02, 0.012)),
      ...[-1, 0, 1].map((sx) => box(sx * 0.445, -0.05, 0, 0.012, 0.02, 0.13)),
    ]),
  }),
  build(kit, G, c) {
    const base = addMesh(c.g, G.base, c.bodyMat);
    addMesh(c.g, G.baseTrim, kit.materials.trim);
    addRobePanel(kit, c, c.g, [0.2, 0.0715, 0.36, 0.09]);
    const yoke = new Group();
    c.g.add(yoke);
    const tiltG = new Group();
    yoke.add(tiltG); // the pivots are fixed to the base: the yoke never pans
    const head = addMesh(tiltG, G.head, c.bodyMat);
    addMesh(tiltG, G.headTrim, kit.materials.trim);
    const lens = addFlatLens(kit, c, tiltG, -0.052, 0.87, 0.115);
    return { head, lens, lensOff: 0.055, joints: { yoke, tiltG }, pick: [base, head] };
  },
};
