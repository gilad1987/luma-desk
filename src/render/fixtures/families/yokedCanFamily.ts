import type { CanvasTexture } from 'three';
import type { ProductId } from '../../../domain/fixtureProducts';
import type { YokedCanBody } from '../../../domain/fixtureProducts/FixtureProduct';
import { addMesh } from '../../shared';
import type { ModelBuilder } from '../FixtureModels';
import { staticMount, type FixtureModel } from '../models/ModelContext';
import { addRoundLens } from '../models/modelFaces';
import { archYoke, type ArchGeometry } from './archYoke';
import { dishGeometry, type DishGeometry } from './dishProfile';
import type { FamilyScope } from './familyModels';
import { reflectorFace } from './reflectorFace';

type YokedCanGeometry = DishGeometry & ArchGeometry;

/**
 * A static dish light in an arch yoke, built through the table's static-model factory, so its geometry is cut `once`
 * on the first fixture; the reflector face is painted lazily on the first fixture too, then shared.
 */
export function yokedCanBuilder(scope: FamilyScope, id: ProductId, body: YokedCanBody): ModelBuilder {
  const face = reflectorFace(body);
  return scope.product(yokedCanModel(body, () => scope.lenses.get(id, face)));
}

/**
 * The arch hangs in the stand (`st`, turned over on the floor like the ParFect's bracket) from its top; the head turns
 * in `aim`: the bowl in the body material; the bezel with its clips, the reflector wall and the grille spokes in alu,
 * the painted face behind. The arch, side brackets and T-knobs are bare metal too, as on the Robe photos.
 */
export function yokedCanModel(body: YokedCanBody, face: () => CanvasTexture): FixtureModel<YokedCanGeometry> {
  return {
    geometry: (prims) => ({ ...dishGeometry(prims, body), ...archYoke(prims, body) }),
    build(kit, G, c) {
      const { aim, st } = staticMount(c);
      addMesh(st, G.arch, kit.materials.alu);
      addMesh(st, G.knobs, kit.materials.alu);
      const head = addMesh(aim, G.head, c.bodyMat);
      addMesh(aim, G.headTrim, kit.materials.alu);
      addMesh(aim, G.reflector, kit.materials.alu);
      c.lensMat.map = face();
      const lens = addRoundLens(kit, c, aim, { y: body.lens.y, radius: body.lens.r });
      return { head, lens, lensOff: body.lens.off, joints: null, pick: [head] };
    },
  };
}
