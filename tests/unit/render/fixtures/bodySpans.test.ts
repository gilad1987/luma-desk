/**
 * Pins every `BODY_SPANS` value against the bounding box of the model the desk really builds, and checks that a
 * fixture with a `bodyScale` is drawn that much smaller with its lens offset scaled alike. The product spans are
 * owned by `productSpans.test.ts`.
 */
import { afterEach, expect, it, vi } from 'vitest';
import type { FixtureTypeId } from '../../../../src/domain/FixtureType';
import { BODY_SPANS } from '../../../../src/domain/fixtureTypes/bodySpans';
import { boxBuilder, spanMm } from './builtBox';
import { stubCanvasDocument } from '../stubCanvasDocument';

afterEach(() => vi.unstubAllGlobals());

it('matches the built model: the largest dimension of every hung body, to the millimetre', () => {
  stubCanvasDocument();
  const box = boxBuilder();
  expect([BODY_SPANS.screen, BODY_SPANS.device]).toEqual([0, 0]);
  const types = (Object.keys(BODY_SPANS) as FixtureTypeId[]).filter((type) => type !== 'screen' && type !== 'device');
  const measured = types.map((type) => [type, spanMm(box({ type }))]);
  expect(measured).toEqual(types.map((type) => [type, Math.round(BODY_SPANS[type] * 1000)]));
});

it('draws a fixture with a bodyScale at that part of its span', () => {
  stubCanvasDocument();
  const box = boxBuilder();
  expect(spanMm(box({ type: 'beam', bodyScale: 0.4 }))).toBe(Math.round(BODY_SPANS.beam * 1000 * 0.4));
  expect(spanMm(box({ type: 'bar', bodyScale: 2 }))).toBe(Math.round(BODY_SPANS.bar * 1000 * 2));
});
