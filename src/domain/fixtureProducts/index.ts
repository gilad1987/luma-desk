import type { FixtureTypeId } from '../FixtureType';
import type { FixtureProduct } from './FixtureProduct';
import { ROBE_PRODUCTS } from './robe';

// fixtureTypeOf.ts imports this file, so this file must never re-export fixtureTypeOf (import cycle).

/**
 * Every catalogue product by id, joined from the brand files in catalogue order. It is checked with `satisfies`, not
 * typed as a record, so `ProductId` derives from its keys and a bad id is a type error in every edit op and test.
 */
export const PRODUCTS = { ...ROBE_PRODUCTS } as const satisfies Record<string, FixtureProduct>;

/** The id a stored fixture names its product by; it is show format, so an id is never renamed. */
export type ProductId = keyof typeof PRODUCTS;

/** Whether a stored string names a catalogue product; own keys only, so `'toString'` is not a product. */
export function isProductId(v: string): v is ProductId {
  return Object.hasOwn(PRODUCTS, v);
}

/**
 * The id when it names a catalogue product whose `base` is `type`, else undefined (also for an id the catalogue does
 * not know): the one owner of the rule a stored or added product must satisfy (the parser drops one that fails it,
 * `addFixtures` and `fixtureTypeOf` throw). It returns the id, not a type guard, because a guard's false branch would
 * tell TypeScript the id is not a `ProductId`, which is wrong for a real product of another base.
 */
export function productIdOf(id: string, type: FixtureTypeId): ProductId | undefined {
  return isProductId(id) && PRODUCTS[id].base === type ? id : undefined;
}

/** Every product id in catalogue order, the library's default order; the guard keeps the key type without a cast. */
export const PRODUCT_IDS: readonly ProductId[] = Object.keys(PRODUCTS).filter(isProductId);

/** The product of a stored id, or undefined for a plain fixture or an id this desk's catalogue does not know. */
export function productOf(id: string | undefined): FixtureProduct | undefined {
  return id !== undefined && isProductId(id) ? PRODUCTS[id] : undefined;
}
