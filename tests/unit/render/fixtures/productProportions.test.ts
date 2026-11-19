/**
 * The silhouette rule over the catalogue: the width / height of every hung product body the desk really builds is
 * within 10 % of its data-sheet width / height, measured in the orientation its data sheet draws. A moving head is
 * measured at rest (the sheets draw it head vertical, lens down), unless its sheet draws the height head-forward
 * (HEAD_FORWARD_SHEETS, each with its source): then its tilt joint turns the head level, as the desk does at tilt 90°,
 * and its head-forward largest dimension is also held within 2 % of the size-rule target, since its pinned `span`
 * is the hung-at-rest measure. A base whose sheet is head-forward (baseSheets.ts) has its native model's head-forward
 * span pinned here too, the span its size rule scales from. A static product is measured with its head focused level
 * to the front, as the sheets draw it (the onePATT's 321 mm height holds the arch over the head): its `pivot` turns
 * from straight down to +z, the turn the pose sync gives a static aimed level. Axes: the data sheet's height is the
 * model's y, and its width, across the yoke arms or the side knobs, is the model's x (`robeYokeGeometry` puts the
 * arms at +-ax on x). The bug it catches: a body with the right span (productSpans.test.ts, productSizes.test.ts) but
 * the wrong silhouette, or a size rule that compares a head-forward sheet with a body at rest.
 */
import { Box3, Vector3 } from 'three';
import { afterEach, expect, it, vi } from 'vitest';
import { D2R } from '../../../../src/core';
import { PRODUCT_IDS, PRODUCTS, type ProductId } from '../../../../src/domain/fixtureProducts';
import type { FixtureTypeId } from '../../../../src/domain/FixtureType';
import { DOWN } from '../../../../src/render/fixtures/sync/syncPose';
import { BASE_SHEETS } from '../../domain/fixtureProducts/baseSheets';
import { baseSpan, HEAD_FORWARD_SHEETS, sizeTarget } from '../../domain/fixtureProducts/sheetSize';
import { stubCanvasDocument } from '../stubCanvasDocument';
import { spanMm, visualBox, visualBuilder } from './builtBox';

afterEach(() => vi.unstubAllGlobals());

const FORWARD = new Vector3(0, 0, 1);

/** The bases whose sheet draws the height head-forward. */
const FORWARD_BASES = (Object.keys(BASE_SHEETS) as (keyof typeof BASE_SHEETS)[]).filter(
  (base) => BASE_SHEETS[base].pose === 'forward',
);

/** The hung body the desk builds for `type` (and `product`), its tilt joint turned so the head faces level. */
function headForwardBox(type: FixtureTypeId, product?: ProductId): Box3 {
  const visual = visualBuilder()({ type, product });
  if (visual.kind !== 'light' || !visual.fixture.T.moving || !visual.joints) {
    throw new Error(`productProportions: ${product ?? type} is listed head-forward but has no tilt joint`);
  }
  visual.joints.tiltG.rotation.x = -90 * D2R;
  return visualBox(visual);
}

/** The hung body the desk builds for `id`, posed as its data sheet draws it. */
function sheetPoseBox(id: ProductId): Box3 {
  if (HEAD_FORWARD_SHEETS.has(id)) return headForwardBox(PRODUCTS[id].base, id);
  const visual = visualBuilder()({ type: PRODUCTS[id].base, product: id });
  if (visual.kind !== 'light') throw new Error(`productProportions: ${id} must build a light visual`);
  if (!visual.fixture.T.moving) visual.pivot.quaternion.setFromUnitVectors(DOWN, FORWARD);
  return visualBox(visual);
}

it.each(PRODUCT_IDS)('draws the hung %s within 10 % of its data-sheet width / height', (id) => {
  stubCanvasDocument();
  const { dimensions } = PRODUCTS[id];
  const size = sheetPoseBox(id).getSize(new Vector3());
  const ratio = size.x / size.y / (dimensions.w / dimensions.h);
  expect(Math.abs(ratio - 1)).toBeLessThanOrEqual(0.1);
});

it.each([...HEAD_FORWARD_SHEETS])('draws the head-forward %s within 2 % of the size-rule target', (id) => {
  stubCanvasDocument();
  const size = sheetPoseBox(id).getSize(new Vector3());
  const target = sizeTarget(id);
  expect(Math.abs(Math.max(size.x, size.y, size.z) - target) / target).toBeLessThanOrEqual(0.02);
});

it.each(FORWARD_BASES)('builds the native %s head-forward to its pinned base span, to the millimetre', (base) => {
  stubCanvasDocument();
  expect(spanMm(headForwardBox(base))).toBe(Math.round(baseSpan(base) * 1000));
});
