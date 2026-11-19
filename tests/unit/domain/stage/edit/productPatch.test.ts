/**
 * Owns what a props patch does with `product`: it sets a product on a plain fixture of the product's base type; a
 * product on a fixture of another base type is dropped by the parser, so the op returns the design itself (no undo
 * step), and a type change on a product fixture drops the product without a throw. The patch that keeps the product is
 * owned by productCarry.
 */
import { describe, expect, it } from 'vitest';
import { setFixtureProps } from '../../../../../src/domain/stage/edit/itemOps.ts';
import type { StageFixture } from '../../../../../src/domain/stage/StageDesign.ts';
import { PIPE, sampleDesign, withEsprite } from './sampleDesign.ts';

/** Fixture 501 of `withEsprite()` with no `product` key: a plain spot. */
const SPOT: StageFixture = {
  id: 501,
  type: 'spot',
  role: 'mid',
  trussId: PIPE.id,
  position: [-4, 7, 0],
  mount: 'hang',
};

describe('setFixtureProps with a product', () => {
  it('returns the design itself when the product is set on a wash, so History adds no step', () => {
    const d = withEsprite();
    expect(setFixtureProps(d, 101, { product: 'robe-esprite' })).toBe(d);
  });

  it('sets the product on a plain spot', () => {
    const d = sampleDesign();
    const next = setFixtureProps({ ...d, fixtures: [...d.fixtures, SPOT] }, 501, { product: 'robe-esprite' });
    expect(next.fixtures.at(-1)).toStrictEqual({ ...SPOT, product: 'robe-esprite' });
  });

  it('drops the product, without a throw, when an Esprite is retyped to a wash', () => {
    const next = setFixtureProps(withEsprite(), 501, { type: 'wash' });
    expect(next.fixtures.at(-1)).toStrictEqual({ ...SPOT, type: 'wash' });
  });
});
