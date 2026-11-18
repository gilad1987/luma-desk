// @vitest-environment jsdom
/** Audit B1, C5, C6, Q10: what the plain writer writes of an imported design, and what its summary admits. */
import { strFromU8, unzipSync } from 'fflate';
import { describe, expect, it } from 'vitest';
import type { DmxPatch } from '../../../../src/domain/stage/DmxPatch.ts';
import type { StageDesign } from '../../../../src/domain/stage/StageDesign.ts';
import { createTemplate } from '../../../../src/domain/stage/templates/index.ts';
import { exportMvr } from '../../../../src/mvr/index.ts';
import { parseXml } from '../../../../src/mvr/xml/parseXml.ts';

const LAYER = { uuid: '0E9B1C2A-1111-4222-8333-444455556666', name: 'Rig' };
const info = { layer: LAYER.uuid, gdtfName: 'Test@Spot.gdtf', gdtfMode: 'Mode 1', type: 'spot' } as const;

/** An imported design without its original bytes: two spots with pool ids and a focus, and one desk device. */
function importedDesign(): StageDesign {
  const spot = { type: 'spot', role: 'front', trussId: null, position: [1, 6, 2], mount: 'hang' } as const;
  const patch = (address: number): DmxPatch => ({ universe: 1, address, mode: '' });
  return {
    ...createTemplate('theatre'),
    source: { kind: 'mvr', name: 'show.mvr' },
    fixtures: [
      { ...spot, id: 1, patch: patch(1) },
      { ...spot, id: 2, patch: patch(101) },
      { ...spot, id: 3, type: 'device', patch: patch(201) },
    ],
    mvr: {
      fixtures: {
        '1': { ...info, uuid: 'A0000000-0000-4000-8000-000000000001', customIdType: 2, customId: 5, focus: [0, 0, 0] },
        '2': { ...info, uuid: 'A0000000-0000-4000-8000-000000000002', customId: 9, fixtureTypeId: 4 },
      },
      layers: [LAYER],
      hiddenLayers: [],
      offset: [0, 0, 0],
    },
  };
}

describe('the plain writer on an imported design', () => {
  const { bytes, summary } = exportMvr(importedDesign());
  const xml = strFromU8(unzipSync(bytes)['GeneralSceneDescription.xml'] ?? new Uint8Array());
  const losses = summary.report.losses.map((item) => item.text);

  it('opens with the declaration the spec shows, without standalone', () => {
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>\n<GeneralSceneDescription ')).toBe(true);
  });

  it('writes CustomIdType and CustomId after the addresses, each only when the file gave one', () => {
    expect(xml).toContain('</Addresses><CustomIdType>2</CustomIdType><CustomId>5</CustomId></Fixture>');
    expect(xml).toContain('</Addresses><CustomId>9</CustomId></Fixture>');
    expect(xml.match(/<CustomId>/g)).toHaveLength(2);
    expect(xml).not.toContain('FixtureTypeId');
  });

  it('gives every Truss, SceneObject and VideoScreen one FixtureID and one FixtureIDNumeric', () => {
    const doc = parseXml(xml);
    const objects = ['Truss', 'SceneObject', 'VideoScreen'].flatMap((tag) => Array.from(doc.getElementsByTagName(tag)));
    const ids = (el: Element, tag: string): (string | null)[] =>
      Array.from(el.children)
        .filter((child) => child.localName === tag)
        .map((child) => child.textContent);
    expect(objects.length).toBeGreaterThan(1);
    expect(objects.every((el) => ids(el, 'FixtureID').length === 1)).toBe(true);
    expect(objects.every((el) => ids(el, 'FixtureIDNumeric').join() === '0')).toBe(true);
  });

  it('names every kind of lost fixture data, with the counts the design holds', () => {
    expect(losses[0]).toContain('is not stored in this browser');
    expect(losses[1]).toContain('DMX addresses of breaks other than the first, the group hierarchy, Protocols,');
    expect(losses[1]).not.toMatch(/classes|positions/);
    expect(losses[2]).toBe(
      '1 fixtures aimed at a focus point in the file; their Focus references are not in this export.',
    );
    expect(losses[3]).toBe(
      '1 fixtures had a FixtureTypeId in the file; MVR 1.6 has no such element, so it is not written.',
    );
  });

  it('says that a desk stand-in GDTF is no file, and does not send the user to GDTF-Share for it', () => {
    const warning = summary.report.warnings.map((item) => item.text).find((text) => text.includes('stand-in'));
    expect(warning).toContain('1 fixtures name LUMA DESK stand-in GDTF files (LUMA DESK@Device.gdtf)');
    expect(summary.notes[0]).toBe('GDTF files are not included; get them from GDTF-Share: Test@Spot.gdtf.');
  });

  it('adds none of these lines for a desk design without stand-in types', () => {
    const plain = exportMvr(createTemplate('theatre')).summary;
    const design = createTemplate('theatre');
    const hasStandIn = design.fixtures.some((fixture) => fixture.type === 'screen' || fixture.type === 'device');
    expect(plain.report.losses.map((item) => item.text).filter((text) => text.includes('imported file'))).toEqual([]);
    expect(plain.notes.some((note) => note.includes('stand-in'))).toBe(hasStandIn);
  });
});
