/**
 * Owns the shape of a built mover product: the Esprite is a Robe mover with joints, head and lens, drawn with its
 * body's lens offset and radius, the body `ref` picks the native head lathe the barrel scales, a `cells` face paints
 * one lens per cell, a mover body gets side vents only when it asks for them, and the Pointe lens is as deep as the
 * MegaPointe one. The lazy creation rule is owned by `lazyProducts.test.ts`, the pinned sizes by `productSpans.test.ts`.
 */
import { Box3, BufferGeometry, Vector3 } from 'three';
import { afterEach, expect, it, vi } from 'vitest';
import { PRODUCTS } from '../../../../../src/domain/fixtureProducts';
import type { MoverBody } from '../../../../../src/domain/fixtureProducts/FixtureProduct';
import { ModelPrimitives, type LightVisual } from '../../../../../src/render/fixtures';
import { moverHead } from '../../../../../src/render/fixtures/families/moverFamily';
import { moverFacePainter } from '../../../../../src/render/fixtures/families/moverFaces';
import { barrelProfile } from '../../../../../src/render/fixtures/families/moverProfile';
import { MOVER_REFERENCES } from '../../../../../src/render/fixtures/families/moverReferences';
import { FORTE_BARREL_PROFILE } from '../../../../../src/render/fixtures/models/forteHead';
import { MEGAPOINTE_BARREL_PROFILE, MEGAPOINTE_HEAD } from '../../../../../src/render/fixtures/models/megapointeHead';
import { SPIIDER_DRUM_PROFILE } from '../../../../../src/render/fixtures/models/spiiderHead';
import type { CanvasPainter } from '../../../../../src/render/shared';
import { asReal } from '../../../../shared/dom';
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

it('draws the Esprite lens disc at the body lens radius, not the FORTE one', () => {
  const visual = buildEsprite();
  visual.g.updateMatrixWorld(true);
  const width = new Box3().setFromObject(visual.lens).getSize(new Vector3()).x;
  expect(width / 2).toBeCloseTo(ESPRITE.body.lens.r * ESPRITE.body.size, 3);
});

it('paints the lens on the fixture lens material, and that material is the lens mesh material', () => {
  const visual = buildEsprite();
  expect([visual.lens.material === visual.lensMat, visual.lensMat.map === null]).toStrictEqual([true, false]);
});

const REFS = [
  ['forte', FORTE_BARREL_PROFILE, 28],
  ['megapointe', MEGAPOINTE_BARREL_PROFILE, 28],
  ['spiider', SPIIDER_DRUM_PROFILE, 32],
] as const;

it.each(REFS)('draws a %s-ref body at its reference shape with that head barrel lathe', (ref, profile, segments) => {
  const body: MoverBody = { ...ESPRITE.body, ref, barrel: MOVER_REFERENCES[ref].shape };
  const round = ([r, y]: readonly [number, number]): number[] => [r, y].map((v) => Math.round(v * 1e9) / 1e9);
  const head = moverHead(body).geometry(new ModelPrimitives(), false).head;
  // the merged lathe is not indexed: two triangles per profile step and segment
  const vertices = (profile.length - 1) * segments * 6;
  expect([barrelProfile(body).map(round), head.getAttribute('position').count]).toStrictEqual([
    profile.map(round),
    vertices,
  ]);
});

/** How many `arc` calls `painter` makes on a 128 px face: one per round lens cell. */
function arcCount(painter: CanvasPainter): number {
  let arcs = 0;
  const context: object = new Proxy({}, { get: (_, key) => (key === 'arc' ? () => void arcs++ : () => context) });
  painter(asReal<CanvasRenderingContext2D>(context), 128, 128);
  return arcs;
}

it('paints one round lens per cell of a cells face, the sum of its ring counts', () => {
  expect([arcCount(moverFacePainter({ cells: [1, 6] })), arcCount(moverFacePainter({ cells: [1, 6, 12] }))]).toEqual([
    7, 19,
  ]);
});

it('sinks the Pointe lens as deep, in lens radii, as the MegaPointe one, so its hot spot shows at a slant', () => {
  const depth = (front: number, y: number, r: number): number => (-front - y) / r;
  const { barrel, lens } = PRODUCTS['robe-pointe'].body;
  const native = depth(MOVER_REFERENCES.megapointe.shape.front, MEGAPOINTE_HEAD.lensY, MEGAPOINTE_HEAD.lensR);
  expect(depth(barrel.front, lens.y, lens.r)).toBeCloseTo(native, 2);
});

it('cuts side vents into a mover head only when its body asks for them', () => {
  const prims = new ModelPrimitives();
  const vented: MoverBody = { ...ESPRITE.body, vents: true };
  const smooth = moverHead(ESPRITE.body).geometry(prims, false);
  const withVents = moverHead(vented).geometry(prims, false);
  expect([smooth.vents, withVents.vents instanceof BufferGeometry]).toStrictEqual([undefined, true]);
});
