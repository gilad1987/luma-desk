/**
 * The silhouette rule over the catalogue: the width / height of every hung product body the desk really builds is
 * within 10 % of its data-sheet width / height. Axes: the data sheet's height (head vertical) is the model's y, and
 * its width, across the yoke arms, is the model's x (`robeYokeGeometry` puts the arms at +-ax on x). The bug it
 * catches: a body with the right span (productSpans.test.ts, productSizes.test.ts) but the wrong silhouette.
 */
import { Vector3 } from 'three';
import { afterEach, expect, it, vi } from 'vitest';
import { PRODUCT_IDS, PRODUCTS } from '../../../../src/domain/fixtureProducts';
import { stubCanvasDocument } from '../stubCanvasDocument';
import { boxBuilder } from './builtBox';

afterEach(() => vi.unstubAllGlobals());

it.each(PRODUCT_IDS)('draws the hung %s within 10 % of its data-sheet width / height', (id) => {
  stubCanvasDocument();
  const { base, dimensions } = PRODUCTS[id];
  const size = boxBuilder()({ type: base, product: id }).getSize(new Vector3());
  const ratio = size.x / size.y / (dimensions.w / dimensions.h);
  expect(Math.abs(ratio - 1)).toBeLessThanOrEqual(0.1);
});
