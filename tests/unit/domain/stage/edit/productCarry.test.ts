/**
 * Owns how the edit ops carry `product`: duplicate, mirror and a props patch keep it, and a truss batch adds it only
 * when the batch names one, so a plain batch adds fixtures with no `product` key; a product of another base or an id
 * the catalogue does not know throws a RangeError (a UI bug must not store a fixture the parser would strip). Where
 * the copies land is owned by itemOps.test.ts, mirror.test.ts and addFixtures.test.ts.
 */
import { describe, expect, it } from 'vitest';
import type { ProductId } from '../../../../../src/domain/fixtureProducts/index.ts';
import { addFixturesOnTruss } from '../../../../../src/domain/stage/edit/addFixtures.ts';
import { duplicateFixtures, setFixtureProps } from '../../../../../src/domain/stage/edit/itemOps.ts';
import { mirrorLeftToRight } from '../../../../../src/domain/stage/edit/mirror.ts';
import type { StageDesign } from '../../../../../src/domain/stage/StageDesign.ts';
import { PIPE, sampleDesign, withEsprite } from './sampleDesign.ts';

/** The `product` of every fixture added past `before`'s fixture count. */
function addedProducts(before: StageDesign, after: StageDesign): unknown[] {
  return after.fixtures.slice(before.fixtures.length).map((f) => (Object.hasOwn(f, 'product') ? f.product : 'none'));
}

/** Two spots on the pipe. */
const SPOTS = { trussId: PIPE.id, type: 'spot', count: 2 } as const;

describe('edit ops carry the product', () => {
  it('keeps the product on a duplicated fixture', () => {
    const d = withEsprite();
    expect(addedProducts(d, duplicateFixtures(d, [501]))).toStrictEqual(['robe-esprite']);
  });

  it('keeps the product on a mirrored fixture', () => {
    const d = withEsprite();
    const next = mirrorLeftToRight(d);
    expect(next.fixtures.filter((f) => f.product === 'robe-esprite').map((f) => f.position)).toStrictEqual([
      [-4, 7, 0],
      [4, 7, 0],
    ]);
  });

  it('keeps the product when a props patch moves the fixture', () => {
    const next = setFixtureProps(withEsprite(), 501, { position: [-3, 7, 0] });
    expect(next.fixtures.find((f) => f.id === 501)?.product).toBe('robe-esprite');
  });

  it('adds a truss batch with a product as fixtures of that product', () => {
    const d = sampleDesign();
    const next = addFixturesOnTruss(d, { trussId: PIPE.id, type: 'spot', product: 'robe-esprite', count: 2 });
    expect(addedProducts(d, next)).toStrictEqual(['robe-esprite', 'robe-esprite']);
  });

  it('adds a truss batch without a product as fixtures with no product key', () => {
    const d = sampleDesign();
    const next = addFixturesOnTruss(d, { trussId: PIPE.id, type: 'spot', count: 2 });
    expect(addedProducts(d, next)).toStrictEqual(['none', 'none']);
  });

  it('refuses a batch whose product has another base than its type', () => {
    const batch = { trussId: PIPE.id, type: 'par', product: 'robe-esprite', count: 2 } as const;
    const add = (): StageDesign => addFixturesOnTruss(sampleDesign(), batch);
    expect(add).toThrow(RangeError);
    expect(add).toThrow(new RangeError('addFixtures: robe-esprite is not a product of type par'));
  });

  it('refuses a batch whose product id the catalogue does not know, with a RangeError', () => {
    const product = 'acme-x' as ProductId; // an unchecked drag payload, as patchedFixtures.test.ts does for a type
    const add = (): StageDesign => addFixturesOnTruss(sampleDesign(), { ...SPOTS, product });
    expect(add).toThrow(RangeError);
    expect(add).toThrow(new RangeError('addFixtures: acme-x is not a product of type spot'));
  });
});
