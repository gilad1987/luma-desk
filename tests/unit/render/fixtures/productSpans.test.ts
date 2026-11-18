/**
 * Pins every catalogue product's `span` and `mountHeight` against the bounding box of the body the desk really
 * builds for it, as `bodySpans` and `mountHeights` pin the native types. It does not check the body shape: the owner
 * checks that in close-up.
 */
import { afterEach, expect, it, vi } from 'vitest';
import { PRODUCT_IDS, PRODUCTS } from '../../../../src/domain/fixtureProducts';
import { boxBuilder, spanMm } from './builtBox';
import { stubCanvasDocument } from '../stubCanvasDocument';

afterEach(() => vi.unstubAllGlobals());

const mm = (value: number): number => Math.round(value * 1000);

it('matches the built model: the largest dimension of every hung product body, to the millimetre', () => {
  stubCanvasDocument();
  const box = boxBuilder();
  const measured = PRODUCT_IDS.map((id) => [id, spanMm(box({ type: PRODUCTS[id].base, product: id }))]);
  expect(measured).toEqual(PRODUCT_IDS.map((id) => [id, mm(PRODUCTS[id].span)]));
});

it('matches the built model: top of the hung product body and bottom of the floor body, to the millimetre', () => {
  stubCanvasDocument();
  const box = boxBuilder();
  const measured = PRODUCT_IDS.map((id) => {
    const fixture = { type: PRODUCTS[id].base, product: id };
    return [id, mm(box({ ...fixture, mount: 'hang' }).max.y), mm(-box({ ...fixture, mount: 'floor' }).min.y)];
  });
  const pinned = PRODUCT_IDS.map((id) => [id, mm(PRODUCTS[id].mountHeight.hang), mm(PRODUCTS[id].mountHeight.floor)]);
  expect(measured).toEqual(pinned);
});
