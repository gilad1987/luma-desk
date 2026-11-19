import { Group, type CanvasTexture } from 'three';
import type { ProductId } from '../../../domain/fixtureProducts';
import type { TiltBarBody } from '../../../domain/fixtureProducts/FixtureProduct';
import { addMesh } from '../../shared';
import type { ModelBuilder } from '../FixtureModels';
import { merge } from '../modelGeometry';
import type { ModelPrimitives } from '../ModelPrimitives';
import type { FixtureModel } from '../models/ModelContext';
import { addFlatLens, addRobePanel } from '../models/modelFaces';
import { CELL_PX, cellRow } from './barFaces';
import type { FamilyScope } from './familyModels';
import { rounded } from './roundedBox';
import { baseBox, baseParts, yokeParts } from './tiltBarParts';

/** The bar head: its rounded box, then trim (the proud front frame around the lens and the dividers between cells). */
function headParts(prims: ModelPrimitives, { head, frame, cells, lens, yoke }: TiltBarBody) {
  const { box } = prims;
  const half = head.w / 2 + yoke.arm,
    fy = head.front - frame.proud / 2,
    divider = lens.off + 0.002 + head.front;
  return {
    head: merge(
      rounded(prims, 'x', {
        at: [0, (head.rear + head.front) / 2, 0],
        size: [head.w, head.rear - head.front, head.d],
        r: 0.045,
      }),
    ),
    headTrim: merge([
      ...[-1, 1].map((sz) =>
        box([0, fy, (sz * (lens.h + frame.d)) / 4], [2 * half, frame.proud, (frame.d - lens.h) / 2]),
      ),
      ...[-1, 1].map((sx) => box([(sx * (lens.w / 2 + half)) / 2, fy, 0], [half - lens.w / 2, frame.proud, lens.h])),
      ...Array.from({ length: cells.count - 1 }, (_, i) =>
        box(
          [(i + 1 - cells.count / 2) * cells.pitch, head.front - divider / 2, 0],
          [cells.pitch - cells.w, divider, lens.h],
        ),
      ),
    ]),
  };
}

type TiltBarGeometry = ReturnType<typeof baseParts> & ReturnType<typeof yokeParts> & ReturnType<typeof headParts>;

/** A tilting bar product: base on the group, the yoke pans (wash base), the tilt group holds the head and the lens. */
function tiltBarModel(body: TiltBarBody): FixtureModel<TiltBarGeometry> {
  return {
    geometry: (prims) => ({ ...baseParts(prims, body), ...yokeParts(prims, body), ...headParts(prims, body) }),
    build(kit, G, c) {
      const { trim, vent, alu } = kit.materials;
      const { y, h } = baseBox(body);
      const base = addMesh(c.g, G.base, c.bodyMat);
      addMesh(c.g, G.baseTrim, trim);
      addMesh(c.g, G.baseVent, vent);
      addRobePanel(kit, c, c.g, [y, body.base.d / 2 + 0.002, 0.36, h * 0.6]);
      const yoke = new Group();
      c.g.add(yoke);
      addMesh(yoke, G.yoke, c.bodyMat);
      addMesh(yoke, G.yokeTrim, trim);
      addMesh(yoke, G.logo, alu);
      const tiltG = new Group();
      yoke.add(tiltG);
      const head = addMesh(tiltG, G.head, c.bodyMat);
      addMesh(tiltG, G.headTrim, trim);
      const lens = addFlatLens(kit, c, tiltG, { y: -body.lens.off, width: body.lens.w, height: body.lens.h });
      return { head, lens, lensOff: body.lens.off, joints: { yoke, tiltG }, pick: [base, head] };
    },
  };
}

/**
 * The builder of a `tiltBar` product: the model geometry is cut `once` on its first fixture, and the cell row lens
 * face is painted on the first fixture too and set on the fixture's own lens material.
 */
export function tiltBarBuilder(scope: FamilyScope, id: ProductId, body: TiltBarBody): ModelBuilder {
  const build = scope.product(tiltBarModel(body));
  const { count, pitch, w } = body.cells;
  const face = (): CanvasTexture => scope.lenses.get(id, cellRow(count, w / pitch), count * CELL_PX, CELL_PX);
  return (c) => {
    c.lensMat.map = face();
    return build(c);
  };
}
