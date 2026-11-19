/**
 * Owns the edge values of the stored `product` key that parseProduct.test.ts leaves out: `null` and an object are
 * present keys with a non-string value, so they are errors by path, not read as an absent product. The kept, dropped
 * and number cases are owned by parseProduct.test.ts; the show loader's fallback by stageField.productEdges.test.ts.
 */
import { describe, expect, it } from 'vitest';
import type { StageFixture } from '../../../../src/domain/stage/StageDesign.ts';
import { errorsOf, SAMPLE } from './parseSample.ts';

const spot: StageFixture = { id: 1, type: 'spot', role: 'front', trussId: 'front', position: [0, 7, 2], mount: 'hang' };

/** The sample design with its first fixture a spot whose `product` is `value`. */
function withProduct(value: unknown): unknown {
  return { ...SAMPLE, fixtures: [{ ...spot, product: value }, ...SAMPLE.fixtures.slice(1)] };
}

describe('parseStageDesign fixture product: non-string edges', () => {
  it('rejects a null product by path instead of reading it as no product', () => {
    expect(errorsOf(withProduct(null))).toEqual(['fixtures[0].product: expected a string, got null']);
  });

  it('rejects an object product by path', () => {
    expect(errorsOf(withProduct({ id: 'robe-esprite' }))).toEqual([
      'fixtures[0].product: expected a string, got an object',
    ]);
  });
});
