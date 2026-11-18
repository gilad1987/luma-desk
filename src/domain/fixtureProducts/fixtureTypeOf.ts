import type { FixtureType, FixtureTypeId } from '../FixtureType';
import { TYPES } from '../fixtureTypes';
import type { FixtureProduct } from './FixtureProduct';
import { PRODUCTS, type ProductId } from './index';

/** One merged record per product id; the catalogue is static data, as `TYPES` is, so a record never goes stale. */
const MERGED = new Map<ProductId, FixtureType>();

/**
 * The type record a fixture is driven and drawn with: `TYPES[type]` itself for a plain fixture, so the built-in rig
 * keeps the same objects, or the product's merged record, whose `model` is the product id the render tables key on.
 * The product's `base` is used, which the parser guarantees equals the stored `type`.
 */
export function fixtureTypeOf(fixture: {
  readonly type: FixtureTypeId;
  readonly product?: ProductId | undefined;
}): FixtureType {
  const { type, product } = fixture;
  if (product === undefined) return TYPES[type];
  const cached = MERGED.get(product);
  if (cached !== undefined) return cached;
  const merged = mergeProduct(PRODUCTS[product]);
  MERGED.set(product, merged);
  return merged;
}

function mergeProduct(product: FixtureProduct): FixtureType {
  const { gdtfSpec, gdtfMode } = product;
  return {
    ...TYPES[product.base],
    ...product.optics,
    ...(gdtfSpec === undefined ? {} : { gdtfSpec }),
    ...(gdtfMode === undefined ? {} : { gdtfMode }),
    name: `${product.brand} ${product.name}`,
    model: product.id,
    size: product.body.size,
  };
}
