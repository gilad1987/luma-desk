import { PRODUCT_IDS, PRODUCTS, type ProductId } from '../../../domain/fixtureProducts';
import type { MoverBody } from '../../../domain/fixtureProducts/FixtureProduct';
import type { CanvasPainter } from '../../shared';
import type { FixtureModelTable, ModelBuilder } from '../FixtureModels';
import { MOVER_LENS_FACES } from '../lens/moverLensFaces';
import { once } from '../modelGeometry';
import type { ModelKit } from '../models/ModelContext';
import type { RobeBaseGeometry } from '../models/robeBase';
import { robeYokeGeometry } from '../models/robeYoke';
import { LazyLensTextures } from './LazyLensTextures';
import { buildMover, moverHead } from './moverFamily';

/** The native geometry the families share with the native models, each a `once` cache of the model table. */
export interface FamilyShared {
  readonly robeBase: () => RobeBaseGeometry;
}

/** What every family builder closes over: the kit, the shared geometry and the one lazy lens set of the table. */
interface FamilyScope extends FamilyShared {
  readonly kit: ModelKit;
  readonly lenses: LazyLensTextures;
}

/** The native painter behind each mover lens face: 'rings' is the FORTE's zoom lens, 'hotspot' the MegaPointe's. */
const MOVER_FACE_PAINTERS = {
  rings: MOVER_LENS_FACES.forte,
  hotspot: MOVER_LENS_FACES.megapointe,
} as const satisfies Record<MoverBody['face'], CanvasPainter>;

/**
 * One model builder per catalogue product, keyed by product id (`FixtureType.model` of a product fixture), to spread
 * over the native table. It creates nothing three.js itself: every geometry sits in a `once` closure and every lens
 * face in the lazy set, so a product costs no `Math.random` draw until its first fixture is built (the boot goldens
 * count every draw), and a product without a fixture costs nothing at all.
 */
export function familyModels(kit: ModelKit, shared: FamilyShared): FixtureModelTable {
  const scope: FamilyScope = { ...shared, kit, lenses: new LazyLensTextures() };
  return Object.fromEntries(PRODUCT_IDS.map((id) => [id, familyBuilder(scope, id)]));
}

function familyBuilder(scope: FamilyScope, id: ProductId): ModelBuilder {
  const { body } = PRODUCTS[id];
  switch (body.family) {
    case 'mover':
      return moverBuilder(scope, id, body);
  }
}

function moverBuilder(scope: FamilyScope, id: ProductId, body: MoverBody): ModelBuilder {
  const { kit, lenses } = scope;
  const head = moverHead(body);
  const geometry = once(() => ({ ...head.geometry(kit.prims, false), ...robeYokeGeometry(kit.prims, body.ax) }));
  const lens = (): ReturnType<LazyLensTextures['get']> => lenses.get(id, MOVER_FACE_PAINTERS[body.face]);
  return (c) => buildMover(kit, c, { model: head, geometry: geometry(), base: scope.robeBase() }, lens);
}
