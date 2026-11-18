// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { gdtfEntryNames, readGdtfEntries } from '../../../src/mvr/gdtf/gdtfEntries.ts';
import { readModels } from '../../../src/mvr/gdtf/readGdtfModels.ts';
import { parseXml } from '../../../src/mvr/xml/parseXml.ts';
import { makeRawNameZip } from '../../shared/index.ts';

/** "models/gltf/Bühne.glb" in Latin-1 bytes, no UTF-8 flag: what a Western Windows tool writes. */
const LATIN1 = Uint8Array.from([
  ...new TextEncoder().encode('models/gltf/B'),
  0xfc,
  ...new TextEncoder().encode('hne.glb'),
]);
const PATH = 'models/gltf/Bühne.glb';
const XML = '<FixtureType><Models><Model Name="Body" File="Bühne"/></Models></FixtureType>';

describe('a GDTF model file whose name is Latin-1 without the UTF-8 flag', () => {
  const gdtf = makeRawNameZip([
    ['description.xml', '<GDTF/>'],
    [LATIN1, 'mesh'],
  ]);

  it('is listed by its other reading after its code page 437 reading', () => {
    const names = gdtfEntryNames(gdtf);
    expect(names.slice(0, 2)).toEqual(['description.xml', 'models/gltf/Bⁿhne.glb']);
    expect(names).toContain(PATH);
  });

  it('is found by the model of the XML and unpacked by that name', () => {
    const fixtureType = parseXml(XML).documentElement;
    expect(readModels(fixtureType, gdtfEntryNames(gdtf)).get('Body')?.path).toBe(PATH);
    const files = readGdtfEntries(gdtf, new Set([PATH]), { entry: 1000, left: 1000 });
    expect(Object.keys(files)).toEqual([PATH]);
    expect(new TextDecoder().decode(files[PATH])).toBe('mesh');
  });
});
