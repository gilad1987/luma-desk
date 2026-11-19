/**
 * The size rule over the catalogue: every product's pinned span is within 2 % of its base model's span in the base
 * sheet's pose (baseSheets.ts) scaled by the product's largest data-sheet dimension over its base fixture's. It
 * catches a size tuned by eye or against the wrong base sheet or pose. It does not measure the built model:
 * productSpans.test.ts pins the span against it. A product whose sheet draws the height head-forward
 * (HEAD_FORWARD_SHEETS) is skipped here: its pinned span is the hung-at-rest measure, so productProportions.test.ts
 * checks its built head-forward box against the target instead.
 */
import { describe, expect, it } from 'vitest';
import { PRODUCT_IDS, PRODUCTS } from '../../../../src/domain/fixtureProducts/index.ts';
import { HEAD_FORWARD_SHEETS, sizeTarget } from './sheetSize.ts';

describe('product sizes', () => {
  it.each(PRODUCT_IDS.filter((id) => !HEAD_FORWARD_SHEETS.has(id)))(
    'pins the %s span within 2 % of the size-rule target',
    (id) => {
      const target = sizeTarget(id);
      expect(Math.abs(PRODUCTS[id].span - target) / target).toBeLessThanOrEqual(0.02);
    },
  );
});
