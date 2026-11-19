/**
 * The size rule over the catalogue: every product's pinned span is within 2 % of `BODY_SPANS[base]` scaled by the
 * product's largest data-sheet dimension over its base fixture's (baseSheets.ts). It catches a size tuned by eye or
 * against the wrong base sheet. It does not measure the built model: productSpans.test.ts pins the span against it.
 */
import { describe, expect, it } from 'vitest';
import { PRODUCT_IDS, PRODUCTS } from '../../../../src/domain/fixtureProducts/index.ts';
import type { FixtureTypeId } from '../../../../src/domain/FixtureType.ts';
import { BODY_SPANS } from '../../../../src/domain/fixtureTypes/bodySpans.ts';
import { BASE_SHEETS, type BaseSheet } from './baseSheets.ts';

const SHEETS: Partial<Record<FixtureTypeId, BaseSheet>> = BASE_SHEETS;

/** The base fixture's sheet; a product on a base with no sheet here has no size rule yet, so the test fails. */
function sheetOf(base: FixtureTypeId): BaseSheet {
  const sheet = SHEETS[base];
  if (!sheet) throw new Error(`productSizes: base type '${base}' has no sheet in baseSheets.ts`);
  return sheet;
}

describe('product sizes', () => {
  it.each(PRODUCT_IDS)('pins the %s span within 2 % of the size-rule target', (id) => {
    const { base, dimensions, span } = PRODUCTS[id];
    const target = (BODY_SPANS[base] * Math.max(dimensions.h, dimensions.w, dimensions.d)) / sheetOf(base).largest;
    expect(Math.abs(span - target) / target).toBeLessThanOrEqual(0.02);
  });
});
