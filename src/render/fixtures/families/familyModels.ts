import { PRODUCT_IDS, PRODUCTS, type ProductId } from '../../../domain/fixtureProducts';
import type { FixtureModelTable, ModelBuilder } from '../FixtureModels';
import type { FixtureModel } from '../models/ModelContext';
import type { RobeHead } from '../models/robeMover';
import { LazyLensTextures } from './LazyLensTextures';
import { moverBuilder } from './moverFamily';
import { tiltBarBuilder } from './tiltBarFamily';

/**
 * The native builder factories the families reuse, from the model table: `robe` caches the head and yoke geometry
 * `once` per call and draws on the table's one Robe base cache, so a product is built exactly like a native head;
 * `product` caches a whole model's geometry `once` and builds it with the table's kit, like a native static model.
 */
export interface FamilyShared {
  readonly robe: (head: RobeHead, fs: boolean) => ModelBuilder;
  readonly product: <G extends object>(model: FixtureModel<G>) => ModelBuilder;
}

/** What every family builder closes over: the shared factories and the one lazy lens set of the table. */
export interface FamilyScope extends FamilyShared {
  readonly lenses: LazyLensTextures;
}

/**
 * One model builder per catalogue product, keyed by product id (`FixtureType.model` of a product fixture), to spread
 * over the native table. It creates nothing three.js itself: every geometry sits in a `once` closure and every lens
 * face in the lazy set, so a product costs no `Math.random` draw until its first fixture is built (the boot goldens
 * count every draw), and a product without a fixture costs nothing at all.
 */
export function familyModels(shared: FamilyShared): FixtureModelTable {
  const scope: FamilyScope = { ...shared, lenses: new LazyLensTextures() };
  return Object.fromEntries(PRODUCT_IDS.map((id) => [id, familyBuilder(scope, id)]));
}

function familyBuilder(scope: FamilyScope, id: ProductId): ModelBuilder {
  const { body } = PRODUCTS[id];
  switch (body.family) {
    case 'mover':
      return moverBuilder(scope, id, body);
    case 'tiltBar':
      return tiltBarBuilder(scope, id, body);
  }
}
