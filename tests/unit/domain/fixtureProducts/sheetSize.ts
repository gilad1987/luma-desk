/**
 * The size rule's target and the sheet-pose list, shared by productSizes.test.ts and the render-side
 * productProportions.test.ts. Test data only (rule T21: no production code reads it).
 */
import { PRODUCTS, type ProductId } from '../../../../src/domain/fixtureProducts/index.ts';
import type { FixtureTypeId } from '../../../../src/domain/FixtureType.ts';
import { BODY_SPANS } from '../../../../src/domain/fixtureTypes/bodySpans.ts';
import { BASE_SHEETS, type BaseSheet } from './baseSheets.ts';

const SHEETS: Partial<Record<FixtureTypeId, BaseSheet>> = BASE_SHEETS;

/**
 * Moving products whose data sheet draws the height head-forward (head tilted level), not hung at rest. Each one is
 * measured head-forward for the size rule and the width / height (productProportions.test.ts), and its pinned `span`
 * stays the hung-at-rest measure, so productSizes.test.ts skips it.
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

/** The size-rule target: `BODY_SPANS[base]` scaled by the product's largest sheet dimension over its base's. */
export function sizeTarget(id: ProductId): number {
  const { base, dimensions } = PRODUCTS[id];
  return (BODY_SPANS[base] * Math.max(dimensions.h, dimensions.w, dimensions.d)) / sheetOf(base).largest;
}
