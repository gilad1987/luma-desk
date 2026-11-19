/**
 * Owns how the MVR mount height and the body scale read a product: a product's own drawn mounting-point distances
 * replace its type's, and a product is drawn at scale 1 even with an imported GDTF size. The pinned values against the
 * built model are owned by the render lane (productSpans.test.ts).
 */
import { describe, expect, it } from 'vitest';
import { PRODUCTS } from '../../../src/domain/fixtureProducts/index.ts';
import { BODY_SPANS } from '../../../src/domain/fixtureTypes/bodySpans.ts';
import { bodyScale } from '../../../src/domain/fixtureTypes/bodyScale.ts';
import { MOUNT_HEIGHTS } from '../../../src/domain/fixtureTypes/mountHeights.ts';
import type { MvrDesignInfo } from '../../../src/domain/stage/mvr.ts';
import { mountHeight } from '../../../src/mvr/design/mountHeight.ts';

describe('product mount height and body scale', () => {
  it("reads the product's own hung and floor mount heights", () => {
    const { hang, floor } = PRODUCTS['robe-esprite'].mountHeight;
    expect([
      mountHeight({ type: 'spot', mount: 'hang', product: 'robe-esprite' }),
      mountHeight({ type: 'spot', mount: 'floor', product: 'robe-esprite' }),
    ]).toStrictEqual([hang, floor]);
  });

  it("keeps the type's mount height for a plain fixture", () => {
    expect(mountHeight({ type: 'spot', mount: 'hang' })).toBe(MOUNT_HEIGHTS.spot.hang);
  });

  it('draws a product with no imported GDTF size at scale 1', () => {
    expect(bodyScale({ id: 1, type: 'spot', product: 'robe-esprite' }, undefined)).toBe(1);
  });

  it('ignores a 1 m GDTF body on a product, and scales a plain spot by its type span', () => {
    const info = { uuid: 'u', layer: 'l', gdtfName: 'Acme@Spot', gdtfMode: 'Std', type: 'spot', bodySize: 1 } as const;
    const mvr: MvrDesignInfo = { fixtures: { '1': info }, layers: [], hiddenLayers: [], offset: [0, 0, 0] };
    expect(bodyScale({ id: 1, type: 'spot', product: 'robe-esprite' }, mvr)).toBe(1);
    expect(bodyScale({ id: 1, type: 'spot' }, mvr)).toBeCloseTo(1 / BODY_SPANS.spot, 6);
  });
});
