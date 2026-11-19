/**
 * The silhouette rule over the catalogue: the width / height of every hung product body the desk really builds is
 * within 10 % of its data-sheet width / height, measured in the sheet's own orientation. A moving head is measured at
 * rest (the sheets draw it head vertical, lens down). A static product is measured with its head focused level to
 * the front, as the sheets draw it (the onePATT's 321 mm height holds the arch over the head): its `pivot` turns from
 * straight down to +z, the turn the pose sync gives a static aimed level. Axes: the data sheet's height is the model's
 * y, and its width, across the yoke arms or the side knobs, is the model's x (`robeYokeGeometry` puts the arms at
 * +-ax on x). The bug it catches: a body with the right span (productSpans.test.ts, productSizes.test.ts) but the
 * wrong silhouette.
 */
import { Vector3 } from 'three';
import { afterEach, expect, it, vi } from 'vitest';
import { PRODUCT_IDS, PRODUCTS } from '../../../../src/domain/fixtureProducts';
import { DOWN } from '../../../../src/render/fixtures/sync/syncPose';
import { stubCanvasDocument } from '../stubCanvasDocument';
import { visualBox, visualBuilder } from './builtBox';

afterEach(() => vi.unstubAllGlobals());

const FORWARD = new Vector3(0, 0, 1);

it.each(PRODUCT_IDS)('draws the hung %s within 10 % of its data-sheet width / height', (id) => {
  stubCanvasDocument();
  const { base, dimensions } = PRODUCTS[id];
  const visual = visualBuilder()({ type: base, product: id });
  if (visual.kind !== 'light') throw new Error(`productProportions: ${id} must build a light visual`);
  if (!visual.fixture.T.moving) visual.pivot.quaternion.setFromUnitVectors(DOWN, FORWARD);
  const size = visualBox(visual).getSize(new Vector3());
  const ratio = size.x / size.y / (dimensions.w / dimensions.h);
  expect(Math.abs(ratio - 1)).toBeLessThanOrEqual(0.1);
});
