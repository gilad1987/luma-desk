import { describe, expect, it } from 'vitest';
import type { BodyPlan } from '../../../src/mvr/import/bodyDraw';
import { bodyLines } from '../../../src/mvr/import/bodyWarnings';
import { productSize, withProductSize } from '../../../src/mvr/import/productSizes';

const desk: BodyPlan = { draw: 'desk', noAxis: false, multiHead: false };

describe('productSizes', () => {
  it('finds a product by the words of its name, however they are spaced', () => {
    expect(productSize(['Martin@MAC Viper Profile'])).toEqual([0.472, 0.335, 0.731]);
    expect(productSize([undefined, 'Robe@Robin LED Beam 150'])).toEqual([0.244, 0.149, 0.337]);
    expect(productSize(['Clay Paky@A.leda B-EYE K10'])).toEqual([0.423, 0.358, 0.494]);
    expect(productSize(['Chauvet@COLORado PXL Bar 16'])).toEqual([1.0, 0.139, 0.273]);
    expect(productSize(['Some Maker@Unknown Spot'])).toBeUndefined();
  });

  it('fits the desk model to the data-sheet box of a known product', () => {
    const plan = withProductSize(desk, ['Robe@Robin Painte'], 'spot');
    expect(plan).toMatchObject({ draw: 'deskAtBox', box: [0.367, 0.219, 0.619], sizeFrom: 'productTable' });
  });

  it('gives an unknown product the default of its desk type, and a type without one the desk size', () => {
    expect(withProductSize(desk, ['x'], 'wash')).toMatchObject({ box: [0.35, 0.3, 0.45], sizeFrom: 'typeDefault' });
    expect(withProductSize(desk, ['x'], 'follow')).toMatchObject({ box: [0.35, 1.2, 0.5] });
    expect(withProductSize(desk, ['x'], 'par')).toBe(desk);
  });

  it('never replaces a GDTF size', () => {
    const sized: BodyPlan = { ...desk, draw: 'deskAtBox', box: [1, 1, 1] };
    expect(withProductSize(sized, ['Martin@MAC Viper Profile'], 'spot')).toBe(sized);
  });

  it('says in the summary where the size is from', () => {
    const plan = withProductSize(desk, ['Martin@MAC Axiom Hybrid'], 'beam');
    const entry = {
      product: 'MAC Axiom Hybrid',
      verdict: { bodyClass: 'none' as const, flags: [] },
      plan,
      noGdtf: true,
    };
    const [line] = bodyLines([entry, entry]);
    expect(line?.message).toBe(
      '2 fixtures of "MAC Axiom Hybrid": no GDTF file in the archive; the desk model is shown at the size of the product\'s data sheet.',
    );
  });
});
