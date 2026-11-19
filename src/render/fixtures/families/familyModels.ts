import type { CanvasTexture } from 'three';
import { PRODUCT_IDS, PRODUCTS, type ProductId } from '../../../domain/fixtureProducts';
import type { MoverBody } from '../../../domain/fixtureProducts/FixtureProduct';
import type { CanvasPainter } from '../../shared';
import type { FixtureModelTable, ModelBuilder } from '../FixtureModels';
import { MOVER_LENS_FACES } from '../lens/moverLensFaces';
import type { RobeHead } from '../models/robeMover';
import { LazyLensTextures } from './LazyLensTextures';
import { moverHead } from './moverFamily';

/**
 * The native builder factories the families reuse, from the model table: `robe` caches the head and yoke geometry
 * `once` per call and draws on the table's one Robe base cache, so a product is built exactly like a native head.
 */
export interface FamilyShared {
  readonly robe: (head: RobeHead, fs: boolean) => ModelBuilder;
}

/** What every family builder closes over: the shared factories and the one lazy lens set of the table. */
interface FamilyScope extends FamilyShared {
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
export function familyModels(shared: FamilyShared): FixtureModelTable {
  const scope: FamilyScope = { ...shared, lenses: new LazyLensTextures() };
  return Object.fromEntries(PRODUCT_IDS.map((id) => [id, familyBuilder(scope, id)]));
}

function familyBuilder(scope: FamilyScope, id: ProductId): ModelBuilder {
  const { body } = PRODUCTS[id];
  switch (body.family) {
    case 'mover':
      return moverBuilder(scope, id, body);
  }
}

/**
 * The native Robe builder for the product's head, with the lazily painted lens face set on the fixture's own lens
 * material first, which a native head gets from `createLensTextures` through the builder instead.
 */
function moverBuilder(scope: FamilyScope, id: ProductId, body: MoverBody): ModelBuilder {
  const build = scope.robe(moverHead(body), false);
  const lens = (): CanvasTexture => scope.lenses.get(id, MOVER_FACE_PAINTERS[body.face]);
  return (c) => {
    c.lensMat.map = lens();
    return build(c);
  };
}
