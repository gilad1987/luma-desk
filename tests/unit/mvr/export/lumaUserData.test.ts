// @vitest-environment jsdom
/**
 * The luma `<UserData>` codec: what `writeLumaData` writes, `readLumaData` reads back unchanged, inside a full
 * exported scene; other versions, other providers and broken data give `undefined`. How the importer uses the result
 * is the importer's test.
 */
import { describe, expect, it } from 'vitest';
import { createTemplate, TEMPLATE_IDS } from '../../../../src/domain/stage/templates/index.ts';
import { writeLumaData } from '../../../../src/mvr/export/lumaUserData.ts';
import { readLumaData } from '../../../../src/mvr/import/readLumaData.ts';
import { linkOf } from '../../../../src/mvr/luma/lumaData.ts';
import { writeScene } from '../../../../src/mvr/export/writeScene.ts';
import { xmlElement, xmlText } from '../../../../src/mvr/export/xmlWriter.ts';
import { parseXml } from '../../../../src/mvr/xml/parseXml.ts';

/** A minimal scene document whose root holds `userData`. */
const docWith = (userData: string): Document =>
  parseXml(`<GeneralSceneDescription verMajor="1" verMinor="6">${userData}<Scene/></GeneralSceneDescription>`);

/** The theatre template's `<UserData>` with its JSON changed by `edit`, for one bad field at a time. */
function withJson(edit: (json: Record<string, unknown>) => Record<string, unknown>): string {
  const { venue, scenery, deck, screens, risers, trusses } = createTemplate('theatre');
  const json = edit({ venue, scenery, deck, screens, risers, trusses, offset: [0, 0, 0], links: [] });
  return xmlElement('UserData', {}, [xmlText('Data', JSON.stringify(json), { provider: 'LUMA DESK', ver: '1' })]);
}

/** A valid fixture link; each bad case changes one field. */
const LINK = { id: 1, type: 'par', role: 'front', trussId: null, mount: 'hang' } as const;

/** A valid link footprint: channels with the GDTF spec and mode they were measured for. */
const FOOTPRINT = { channels: 6, gdtfSpec: 'Acme@Six', gdtfMode: 'Six' } as const;

/** The helper data with one link whose `footprint` is `footprint`. */
const withFootprint = (footprint: unknown): string =>
  withJson((json) => ({ ...json, links: [{ ...LINK, footprint }] }));

describe('readLumaData', () => {
  it.each(TEMPLATE_IDS)('reads back the stage parts of the %s template from its exported scene', (id) => {
    const design = createTemplate(id);
    const { venue, scenery, deck, screens, risers, trusses } = design;
    const links: unknown = JSON.parse(JSON.stringify(design.fixtures.map(linkOf)));
    const doc = parseXml(writeScene(design).xml);
    const offset = [0, 0, 0];
    expect(readLumaData(doc)).toStrictEqual({ venue, scenery, deck, screens, risers, trusses, offset, links });
  });

  it('reads the unedited helper data, so each bad case below fails on its one bad field', () => {
    expect(readLumaData(docWith(withJson((json) => json)))).toBeDefined();
    expect(readLumaData(docWith(withFootprint(FOOTPRINT)))?.links).toEqual([{ ...LINK, footprint: FOOTPRINT }]);
  });

  it('reads back the offset the export took off', () => {
    const design = createTemplate('theatre');
    expect(readLumaData(docWith(writeLumaData(design, [1.5, -2, 0.25])))?.offset).toEqual([1.5, -2, 0.25]);
  });

  it('keeps Hebrew and XML special characters in names', () => {
    const base = createTemplate('theatre');
    const [first, ...rest] = base.trusses;
    if (!first) throw new Error('the theatre template has no truss');
    const name = 'טראס קדמי <A & "B">';
    const design = { ...base, trusses: [{ ...first, name }, ...rest] };
    expect(readLumaData(docWith(writeLumaData(design, [0, 0, 0])))?.trusses[0]?.name).toBe(name);
  });
});

describe('readLumaData of bad data', () => {
  it.each([
    ['no UserData', ''],
    ['another provider', '<UserData><Data provider="Other" ver="1">{}</Data></UserData>'],
    ['another version', writeLumaData(createTemplate('theatre'), [0, 0, 0]).replace('ver="1"', 'ver="2"')],
    ['broken JSON', '<UserData><Data provider="LUMA DESK" ver="1">{"venue":</Data></UserData>'],
    ['an invalid deck', '<UserData><Data provider="LUMA DESK" ver="1">{"deck":{"x0":"a"}}</Data></UserData>'],
    ['a bad offset', withJson((json) => ({ ...json, offset: [1, 'a', 0] }))],
    ['a link with an unknown role', withJson((json) => ({ ...json, links: [{ ...LINK, role: 'x' }] }))],
    ['a link to an unknown truss', withJson((json) => ({ ...json, links: [{ ...LINK, trussId: 'x' }] }))],
    ['a link with an unknown type', withJson((json) => ({ ...json, links: [{ ...LINK, type: 'laser' }] }))],
    ['a link with an unknown mount', withJson((json) => ({ ...json, links: [{ ...LINK, mount: 'roof' }] }))],
    ['a link with a bad fixed aim', withJson((json) => ({ ...json, links: [{ ...LINK, fixed: { pan: 'a' } }] }))],
    ['a footprint over 512', withFootprint({ ...FOOTPRINT, channels: 600 })],
    ['a text footprint', withFootprint({ ...FOOTPRINT, channels: '6' })],
    ['a bare footprint number', withFootprint(6)],
    ['a footprint without its GDTF mode', withFootprint({ channels: 6, gdtfSpec: 'Acme@Six' })],
    ['a footprint with a number for its GDTF spec', withFootprint({ ...FOOTPRINT, gdtfSpec: 6 })],
    ['a link with a bad pixel', withJson((json) => ({ ...json, links: [{ ...LINK, pixel: { len: 1 } }] }))],
  ])('gives undefined for %s', (_name, userData) => {
    expect(readLumaData(docWith(userData))).toBeUndefined();
  });
});
