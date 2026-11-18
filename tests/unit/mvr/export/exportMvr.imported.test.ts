// @vitest-environment jsdom
/**
 * Re-export of an imported design: its fixture and layer uuids, Hebrew layer names, GDTF names and real patch stay,
 * and the fit offset is taken off. Losing any of them breaks a console's match of the re-exported file to its show.
 */
import { describe, expect, it } from 'vitest';
import { MOUNT_HEIGHTS } from '../../../../src/domain/fixtureTypes/mountHeights.ts';
import type { StageDesign } from '../../../../src/domain/stage/StageDesign.ts';
import { createTemplate } from '../../../../src/domain/stage/templates/index.ts';
import { writeScene } from '../../../../src/mvr/export/writeScene.ts';
import { pointToThree } from '../../../../src/mvr/math/axes.ts';
import { transformPoint } from '../../../../src/mvr/math/Mat4.ts';
import { walkScene } from '../../../../src/mvr/scene/walkScene.ts';
import { parseXml } from '../../../../src/mvr/xml/parseXml.ts';

const LAYER = { uuid: '0E9B1C2A-1111-4222-8333-444455556666', name: 'במה ראשית' };
const FIXTURE_UUID = 'A1B2C3D4-0000-4000-8000-000000000001';

/** An imported design: one patched spot in a Hebrew layer, one unpatched par without MVR facts, fitted by 1 m. */
function importedDesign(): StageDesign {
  const base = createTemplate('empty');
  const spot = { id: 7, type: 'spot', role: 'front', trussId: null, position: [1, 6, 2], mount: 'hang' } as const;
  const patch = { universe: 3, address: 101, mode: 'Mode 2' };
  return {
    ...base,
    source: { kind: 'mvr', name: 'show.mvr' },
    fixtures: [
      { ...spot, patch },
      { ...spot, id: 8, type: 'par', position: [0, 1, 0], mount: 'floor' },
    ],
    mvr: {
      fixtures: {
        '7': {
          uuid: FIXTURE_UUID,
          layer: LAYER.uuid,
          gdtfName: 'Robe Lighting@Robin Esprite.gdtf',
          gdtfMode: 'Mode 2',
          type: 'spot',
        },
      },
      layers: [LAYER],
      hiddenLayers: [],
      offset: [0, 1, 0],
    },
  };
}

describe('writeScene of an imported design', () => {
  const xml = writeScene(importedDesign()).xml;
  const scene = walkScene(parseXml(xml));
  const [spot, par] = scene.fixtures;

  it('keeps the layer uuid and Hebrew name first, then adds the desk layers', () => {
    expect([scene.layers[0], scene.layers.length, xml.includes(LAYER.name)]).toStrictEqual([LAYER, 7, true]);
  });

  it('keeps the fixture uuid, layer, GDTF name, mode and patch', () => {
    const facts = [spot?.uuid, spot?.layer, spot?.gdtfSpec, spot?.gdtfMode, spot?.addresses];
    expect(facts).toStrictEqual([
      FIXTURE_UUID,
      LAYER.uuid,
      'Robe Lighting@Robin Esprite.gdtf',
      'Mode 2',
      [{ dmxBreak: 0, value: String(2 * 512 + 101) }],
    ]);
  });

  it('puts a fixture without MVR facts in the Fixtures layer, patched after the highest used universe', () => {
    const fixturesLayer = scene.layers.find((layer) => layer.name === 'Fixtures')?.uuid;
    expect([par?.layer, par?.gdtfSpec, par?.addresses]).toStrictEqual([
      fixturesLayer,
      'Robe Lighting@ParFect 150.gdtf',
      [{ dmxBreak: 0, value: String(3 * 512 + 1) }],
    ]);
  });

  // The matrix is the mounting point: the hung spot's clamp is its hang height above the desk position (tilt axis).
  it('takes the fit offset off the positions and writes the mounting point', () => {
    const position = spot ? pointToThree(transformPoint(spot.matrix, [0, 0, 0])) : [];
    const mounting = 5 + MOUNT_HEIGHTS.spot.hang;
    expect(position.map((value) => Math.round(value * 1000) / 1000)).toEqual([1, mounting, 2]);
  });
});
