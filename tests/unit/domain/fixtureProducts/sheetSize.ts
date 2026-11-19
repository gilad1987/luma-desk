/**
 * The size rule's target and the product-side sheet-pose list, shared by productSizes.test.ts and the render-side
 * productProportions.test.ts. Test data only (rule T21: no production code reads it).
 */
import { PRODUCTS, type ProductId } from '../../../../src/domain/fixtureProducts/index.ts';
import type { FixtureTypeId } from '../../../../src/domain/FixtureType.ts';
import { BODY_SPANS } from '../../../../src/domain/fixtureTypes/bodySpans.ts';
import { BASE_SHEETS, type BaseSheet } from './baseSheets.ts';

const SHEETS: Partial<Record<FixtureTypeId, BaseSheet>> = BASE_SHEETS;

/**
 * The product-side pose list: moving products whose data sheet draws the height head-forward (head tilted level), not
 * head vertical; every other product's sheet pose is 'vertical' (its sheet says "head vertical", or no Robe drawing
 * settles it). Each one is measured head-forward for the size rule and the width / height
 * (productProportions.test.ts), and its pinned `span` stays the hung-at-rest measure, so productSizes.test.ts skips it.
 */
export const HEAD_FORWARD_SHEETS: ReadonlySet<ProductId> = new Set<ProductId>([
  // Robe Tarrantula user manual p34: the 587.4 mm height is the 397 mm tilt axis plus the head radius, head facing front
  'robe-tarrantula',
]);

/** The base fixture's sheet; a product on a base with no sheet here has no size rule yet, so the test fails. */
function sheetOf(base: FixtureTypeId): BaseSheet {
  const sheet = SHEETS[base];
  if (!sheet) throw new Error(`productSizes: base type '${base}' has no sheet in baseSheets.ts`);
  return sheet;
}

/** The native base model's largest dimension in metres in its sheet pose: `BODY_SPANS` hung at rest, or head-forward. */
export function baseSpan(base: FixtureTypeId): number {
  const sheet = sheetOf(base);
  return sheet.pose === 'forward' ? sheet.forwardSpan : BODY_SPANS[base];
}

/**
 * The size-rule target, in metres: the base model's span in its sheet pose scaled by the product's largest sheet
 * dimension over its base's. The product's built largest dimension in its own sheet pose must meet it within 2 %.
 */
export function sizeTarget(id: ProductId): number {
  const { base, dimensions } = PRODUCTS[id];
  return (baseSpan(base) * Math.max(dimensions.h, dimensions.w, dimensions.d)) / sheetOf(base).largest;
}
