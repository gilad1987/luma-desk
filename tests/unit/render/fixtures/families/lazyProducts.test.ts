/**
 * Owns the lazy-creation rule of the product families: the boot-time sets (lens textures, materials, model table)
 * stay the 9 natives' and draw no `Math.random` for a product until its first fixture is built, so `random-calls.json`
 * and the fixture-scene golden cannot move; later fixtures of the product reuse that first geometry and lens face.
 * The per-product cases run on the first product of each body family, so a new family is covered with no edit.
 * The product body shape is owned by `mover.test.ts`.
 */
import { CanvasTexture } from 'three';
import { afterEach, expect, it, vi } from 'vitest';
import { PRODUCT_IDS } from '../../../../../src/domain/fixtureProducts';
import * as fx from '../../../../../src/render/fixtures';
import { stubCanvasDocument } from '../../stubCanvasDocument';
import { bootThenSpy, firstProductOfEachFamily, groupGeometries, lensFace } from './productVisual';

const NATIVE_LENS_KEYS = ['forte', 'megapointe', 'spiider', 'parfect', 'strike4', 'wtf', 'tetra2', 's4', 'forteFS'];
const NATIVE_MODEL_KEYS = ['forte', 'forteFS', 'megapointe', 'spiider', 'wtf', 'strike4', 'parfect', 's4', 'tetra2'];
const FAMILY_FIRSTS = firstProductOfEachFamily();

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

it('keeps the boot-time lens set to the 9 native faces in their order', () => {
  stubCanvasDocument();
  expect(Object.keys(fx.createLensTextures())).toStrictEqual(NATIVE_LENS_KEYS);
});

it('keeps the boot-time materials to trim, panel, vent and alu', () => {
  stubCanvasDocument();
  expect(Object.keys(fx.createModelMaterials(fx.createTrimMaterial()))).toStrictEqual(['trim', 'panel', 'vent', 'alu']);
});

it('creates the model table with no random draw and keys it by the natives then the product ids', () => {
  const { spy, models } = bootThenSpy();
  const keys = Object.keys(models);
  expect([spy.mock.calls.length, keys, new Set(keys).size]).toStrictEqual([
    0,
    [...NATIVE_MODEL_KEYS, ...PRODUCT_IDS],
    NATIVE_MODEL_KEYS.length + PRODUCT_IDS.length,
  ]);
});

it.each(FAMILY_FIRSTS)('draws the %s geometry and lens face on the first fixture only', (id) => {
  const { spy, build } = bootThenSpy();
  const draws = (): number => {
    const before = spy.mock.calls.length;
    build(id);
    return spy.mock.calls.length - before;
  };
  const [first, second, third] = [draws(), draws(), draws()];
  expect([first > 0, second < first, third]).toStrictEqual([true, true, second]);
});

it.each(FAMILY_FIRSTS)('reuses every %s group geometry for the next fixture of that product', (id) => {
  const { build } = bootThenSpy();
  const [a, b] = [groupGeometries(build(id)), groupGeometries(build(id))];
  expect([a.length > 0, a.length === b.length, a.every((g, i) => g === b[i])]).toStrictEqual([true, true, true]);
});

it.each(FAMILY_FIRSTS)('shares one painted %s lens face between two fixtures of that product', (id) => {
  const { build } = bootThenSpy();
  const [a, b] = [lensFace(build(id)), lensFace(build(id))];
  expect([a instanceof CanvasTexture, a === b]).toStrictEqual([true, true]);
});
