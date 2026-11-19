import { strToU8 } from 'fflate';
import { describe, expect, it } from 'vitest';
import { MvrArchive } from '../../../src/mvr/archive/MvrArchive.ts';
import { crc32 } from '../../../src/mvr/archive/unicodePath.ts';
import { readGdtfEntries, gdtfEntryNames } from '../../../src/mvr/gdtf/gdtfEntries.ts';
import { makeRawNameZip } from '../../shared/index.ts';

/** A Hebrew file name (the word for "stage"), as XML text holds it. */
const HEBREW = '\u05d1\u05de\u05d4.glb';
/** A German name with one composed character. */
const GERMAN = 'B\u00fchne.glb';
/** The Hebrew name in Windows-1255 bytes: what a Hebrew Windows tool writes into the standard name field. */
const CP1255 = Uint8Array.from([0xe1, 0xee, 0xe4, 0x2e, 0x67, 0x6c, 0x62]);

/** An Info-ZIP Unicode Path field (0x7075): version 1, the CRC-32 of the standard name, the UTF-8 name. */
function unicodeField(standardName: Uint8Array, name: string): Record<number, Uint8Array> {
  const field = new Uint8Array(5 + strToU8(name).length);
  field[0] = 1;
  new DataView(field.buffer).setUint32(1, crc32(standardName), true);
  field.set(strToU8(name), 5);
  return { 0x7075: field };
}

describe('the Unicode Path extra field of a ZIP entry', () => {
  it('has the CRC-32 of the ZIP format', () => {
    expect(crc32(strToU8('123456789'))).toBe(0xcbf43926);
  });

  it('gives the real name of an entry whose standard name is in a Hebrew code page', () => {
    const archive = MvrArchive.open(makeRawNameZip([[CP1255, 'deck', unicodeField(CP1255, HEBREW)]]));
    expect(archive.names).toEqual([HEBREW]);
    expect(archive.text(HEBREW)).toBe('deck');
  });

  it('is not used when its CRC does not match the standard name, as the format requires', () => {
    const stale = unicodeField(strToU8('other.glb'), HEBREW);
    const archive = MvrArchive.open(makeRawNameZip([[CP1255, 'deck', stale]]));
    expect(archive.names).not.toEqual([HEBREW]);
    expect(archive.text(HEBREW)).toBeUndefined();
  });

  it('names the model files inside a GDTF the same way', () => {
    const gdtf = makeRawNameZip([
      ['description.xml', '<GDTF/>'],
      [GERMAN, 'mesh'],
      [CP1255, 'deck', unicodeField(CP1255, HEBREW)],
    ]);
    expect(gdtfEntryNames(gdtf).slice(0, 3)).toEqual(['description.xml', GERMAN, HEBREW]);
    const files = readGdtfEntries(gdtf, new Set([GERMAN, HEBREW]), { entry: 1000, left: 1000 });
    expect(Object.keys(files).sort()).toEqual([GERMAN, HEBREW].sort());
  });

  it('names a model file in a GDTF folder, and the MVR archive still keeps root files only', () => {
    const folder = strToU8('models/gltf/');
    const raw = Uint8Array.from([...folder, ...CP1255]);
    const path = `models/gltf/${HEBREW}`;
    const zip = makeRawNameZip([
      ['description.xml', '<GDTF/>'],
      [raw, 'deck', unicodeField(raw, path)],
    ]);
    expect(gdtfEntryNames(zip)).toContain(path);
    expect(Object.keys(readGdtfEntries(zip, new Set([path]), { entry: 1000, left: 1000 }))).toEqual([path]);
    expect(MvrArchive.open(zip).names).toEqual(['description.xml']);
    const moved = makeRawNameZip([[CP1255, 'deck', unicodeField(CP1255, `models/${HEBREW}`)]]);
    expect(MvrArchive.open(moved).names).toEqual([]);
  });
});
