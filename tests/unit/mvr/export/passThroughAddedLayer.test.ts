// @vitest-environment jsdom
/** Review #5: a fixture added on the desk never goes into a layer whose own `<Matrix>` would move it again. */
import { strFromU8, unzipSync } from 'fflate';
import { describe, expect, it } from 'vitest';
import { stableUuid } from '../../../../src/mvr/export/stableUuid.ts';
import { exportMvr, importMvr } from '../../../../src/mvr/index.ts';
import { parseXml } from '../../../../src/mvr/xml/parseXml.ts';
import { fx, makeMvr, passUuid as u } from '../../../shared/index.ts';

const DESK_LAYER = stableUuid('layer|fixtures');
const sceneWith = (deskLayer: string): string =>
  '<?xml version="1.0" encoding="UTF-8"?>\n<GeneralSceneDescription verMajor="1" verMinor="6"><Scene><AUXData/>' +
  '<Layers><Layer uuid="B0000000-0000-4000-8000-000000000001" name="L"><ChildList>' +
  fx(u(1), 1, { addresses: '<Address break="0">1</Address>' }) +
  `</ChildList></Layer>${deskLayer}</Layers></Scene></GeneralSceneDescription>\n`;
const MATRIX = '<Matrix>{1,0,0}{0,1,0}{0,0,1}{0,0,1000}</Matrix>';

const layerUuids = (bytes: Uint8Array): string[] => {
  const scene = strFromU8(unzipSync(bytes)['GeneralSceneDescription.xml'] ?? new Uint8Array());
  return Array.from(parseXml(scene).getElementsByTagName('Layer'), (layer) => layer.getAttribute('uuid') ?? '');
};

async function addedRoundTrip(deskLayers: string): Promise<{ expected: number[]; actual: number[]; layers: string[] }> {
  const original = makeMvr(sceneWith(deskLayers), { 'Test@Spot.gdtf': new TextEncoder().encode('x') });
  const first = await importMvr(original, { name: 'a.mvr' });
  const spot = first.design.fixtures[0];
  if (!spot) throw new Error('no fixture');
  const added = { ...spot, id: 99 };
  const { bytes } = exportMvr({ ...first.design, fixtures: [...first.design.fixtures, added] }, { original });
  const again = (await importMvr(bytes, { name: 'b.mvr' })).design.fixtures.find((fixture) => fixture.id === 99);
  if (!again) throw new Error('the added fixture is missing');
  return { expected: [...added.position], actual: [...again.position], layers: layerUuids(bytes) };
}

describe('pass-through layer of a fixture added on the desk (review #5)', () => {
  const cases: readonly (readonly [string, string])[] = [
    ['a plain desk layer', `<Layer uuid="${DESK_LAYER}" name="Fixtures"><ChildList></ChildList></Layer>`],
    ['a desk layer with its own Matrix', `<Layer uuid="${DESK_LAYER}" name="Fixtures">${MATRIX}<ChildList/></Layer>`],
    [
      'a desk layer and the next candidate, both with a Matrix',
      `<Layer uuid="${DESK_LAYER}" name="Fixtures">${MATRIX}<ChildList/></Layer>` +
        `<Layer uuid="${stableUuid('layer|fixtures|1')}" name="F">${MATRIX}<ChildList/></Layer>`,
    ],
  ];
  for (const [label, deskLayers] of cases) {
    it(`returns the added fixture at its desk position with ${label}`, async () => {
      const { expected, actual, layers } = await addedRoundTrip(deskLayers);
      expected.forEach((value, axis) => expect(actual[axis]).toBeCloseTo(value, 6));
      expect(new Set(layers).size).toBe(layers.length);
    });
  }
});
