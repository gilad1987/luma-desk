/**
 * Owns the lazy-creation rule of the product families: the boot-time sets (lens textures, materials, model table)
 * stay the 9 natives' and draw no `Math.random` for a product until its first fixture is built, so `random-calls.json`
 * and the fixture-scene golden cannot move. The product body shape is owned by `mover.test.ts`.
 */
import { CanvasTexture, Scene, Vector3 } from 'three';
import { afterEach, expect, it, vi } from 'vitest';
import { Fixture } from '../../../../../src/domain/Fixture';
import { PRODUCT_IDS } from '../../../../../src/domain/fixtureProducts';
import * as fx from '../../../../../src/render/fixtures';
import { stubCanvasDocument } from '../../stubCanvasDocument';

const NATIVE_LENS_KEYS = ['forte', 'megapointe', 'spiider', 'parfect', 'strike4', 'wtf', 'tetra2', 's4', 'forteFS'];
const NATIVE_MODEL_KEYS = ['forte', 'forteFS', 'megapointe', 'spiider', 'wtf', 'strike4', 'parfect', 's4', 'tetra2'];

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

/** The boot before the model table, then the spy, so only the table and the fixtures count. */
function bootThenSpy() {
  stubCanvasDocument();
  const scene = new Scene();
  const gobo = fx.createGoboAtlas();
  const beam = fx.createBeamShared();
  const lensTextures = fx.createLensTextures();
  const prims = new fx.ModelPrimitives();
  const kit = { prims, materials: fx.createModelMaterials(fx.createTrimMaterial()) };
  const spy = vi.spyOn(Math, 'random');
  const models = fx.createFixtureModels(kit);
  const picker = { register: () => undefined };
  const builder = new fx.FixtureVisualBuilder({
    scene,
    prims,
    beam,
    gobo,
    models,
    lensTextures,
    screenMesh: new Map(),
    picker,
  });
  const esprite = () =>
    new Fixture({ id: 9001, type: 'spot', pos: new Vector3(), mount: 'hang', fixed: null, product: 'robe-esprite' });
  return { spy, models, builder, esprite };
}

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

it('draws the product geometry and lens face on the first fixture only', () => {
  const { spy, builder, esprite } = bootThenSpy();
  const draws = (): number => {
    const before = spy.mock.calls.length;
    builder.build(esprite());
    return spy.mock.calls.length - before;
  };
  const [first, second, third] = [draws(), draws(), draws()];
  expect([first > 0, second < first, third]).toStrictEqual([true, true, second]);
});

it('shares one painted lens face between two fixtures of the same product', () => {
  const { builder, esprite } = bootThenSpy();
  const [a, b] = [builder.build(esprite()), builder.build(esprite())];
  if (a.kind !== 'light' || b.kind !== 'light') throw new Error('an Esprite builds a light visual');
  expect([a.lensMat.map instanceof CanvasTexture, a.lensMat.map === b.lensMat.map]).toStrictEqual([true, true]);
});
