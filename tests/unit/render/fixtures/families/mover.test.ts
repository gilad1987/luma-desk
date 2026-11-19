/**
 * Owns the shape of a built mover product: the Esprite is a Robe mover with joints, head and lens, drawn with its
 * body's lens numbers, and a mover body gets side vents only when it asks for them. The lazy creation rule is owned by
 * `lazyProducts.test.ts`, the pinned sizes by `productSpans.test.ts`.
 */
import { BufferGeometry } from 'three';
import { afterEach, expect, it, vi } from 'vitest';
import { PRODUCTS } from '../../../../../src/domain/fixtureProducts';
import type { MoverBody } from '../../../../../src/domain/fixtureProducts/FixtureProduct';
import { ModelPrimitives, type LightVisual } from '../../../../../src/render/fixtures';
import { moverHead } from '../../../../../src/render/fixtures/families/moverFamily';
import { stubCanvasDocument } from '../../stubCanvasDocument';
import { visualBuilder } from '../builtBox';

afterEach(() => vi.unstubAllGlobals());

const ESPRITE = PRODUCTS['robe-esprite'];

function buildEsprite(): LightVisual {
  stubCanvasDocument();
  const visual = visualBuilder()({ type: 'spot', product: 'robe-esprite' });
  if (visual.kind !== 'light') throw new Error('an Esprite builds a light visual');
  return visual;
}

it('builds the Esprite as a moving light with joints, a head and a lens at the body lens offset', () => {
  const visual = buildEsprite();
  expect([visual.joints === null, visual.head.isMesh, visual.lens.isMesh]).toStrictEqual([false, true, true]);
  expect(visual.lensOff).toBeCloseTo(ESPRITE.body.lens.off * ESPRITE.body.size, 6);
});

it('paints the lens on the fixture lens material, and that material is the lens mesh material', () => {
  const visual = buildEsprite();
  expect([visual.lens.material === visual.lensMat, visual.lensMat.map === null]).toStrictEqual([true, false]);
});

it('cuts side vents into a mover head only when its body asks for them', () => {
  const prims = new ModelPrimitives();
  const vented: MoverBody = { ...ESPRITE.body, vents: true };
  const smooth = moverHead(ESPRITE.body).geometry(prims, false);
  const withVents = moverHead(vented).geometry(prims, false);
  expect([smooth.vents, withVents.vents instanceof BufferGeometry]).toStrictEqual([undefined, true]);
});
