/**
 * Pins every `MOUNT_HEIGHTS` value against the bounding box of the model the desk really builds. The product mount
 * heights are owned by `productSpans.test.ts`.
 */
import { afterEach, expect, it, vi } from 'vitest';
import type { FixtureTypeId } from '../../../../src/domain/FixtureType';
import { MOUNT_HEIGHTS } from '../../../../src/domain/fixtureTypes/mountHeights';
import { boxBuilder } from './builtBox';
import { stubCanvasDocument } from '../stubCanvasDocument';

afterEach(() => vi.unstubAllGlobals());

it('matches the built model: top of the hung body and bottom of the floor body, to the millimetre', () => {
  stubCanvasDocument();
  const box = boxBuilder();
  // the screen has no model: the venue draws it, so its origin is its mounting point
  expect(MOUNT_HEIGHTS.screen).toEqual({ hang: 0, floor: 0 });
  expect(MOUNT_HEIGHTS.device).toEqual({ hang: 0, floor: 0 });
  const types = (Object.keys(MOUNT_HEIGHTS) as FixtureTypeId[]).filter(
    (type) => type !== 'screen' && type !== 'device',
  );
  const mm = (value: number): number => Math.round(value * 1000);
  const measured = types.map((type) => [
    type,
    mm(box({ type, mount: 'hang' }).max.y),
    mm(-box({ type, mount: 'floor' }).min.y),
  ]);
  const pinned = types.map((type) => [type, mm(MOUNT_HEIGHTS[type].hang), mm(MOUNT_HEIGHTS[type].floor)]);
  expect(measured).toEqual(pinned);
});
