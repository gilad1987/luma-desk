/**
 * Owns what a props patch does with `product` when the product and the type disagree: a product on a fixture of
 * another base type is dropped by the parser, so the op returns the design itself (no undo step), and a type change on
 * a product fixture drops the product without a throw. The patch that keeps the product is owned by productCarry.
 */
import { describe, expect, it } from 'vitest';
import { setFixtureProps } from '../../../../../src/domain/stage/edit/itemOps.ts';
import type { StageDesign, StageFixture } from '../../../../../src/domain/stage/StageDesign.ts';
import { PIPE, sampleDesign } from './sampleDesign.ts';

const SPOT: StageFixture = {
  id: 501,
  type: 'spot',
  role: 'mid',
  trussId: PIPE.id,
  position: [-4, 7, 0],
  mount: 'hang',
};

/** The sample design (washes 101 and 102 on the pipe) plus `fixture`. */
function withFixture(fixture: StageFixture): StageDesign {
  const d = sampleDesign();
  return { ...d, fixtures: [...d.fixtures, fixture] };
}

describe('setFixtureProps with a product of another base type', () => {
  it('returns the design itself when the product is set on a wash, so History adds no step', () => {
    const d = withFixture(SPOT);
    expect(setFixtureProps(d, 101, { product: 'robe-esprite' })).toBe(d);
  });

  it('sets the product on a plain spot', () => {
    const next = setFixtureProps(withFixture(SPOT), 501, { product: 'robe-esprite' });
    expect(next.fixtures.at(-1)).toStrictEqual({ ...SPOT, product: 'robe-esprite' });
  });

  it('drops the product, without a throw, when an Esprite is retyped to a wash', () => {
    const next = setFixtureProps(withFixture({ ...SPOT, product: 'robe-esprite' }), 501, { type: 'wash' });
    expect(next.fixtures.at(-1)).toStrictEqual({ ...SPOT, type: 'wash' });
  });
});
