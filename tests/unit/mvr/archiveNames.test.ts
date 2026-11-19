import { describe, expect, it } from 'vitest';
import { MvrArchive } from '../../../src/mvr/archive/MvrArchive.ts';
import { cp437 } from '../../../src/mvr/archive/cp437.ts';
import { makeRawNameZip, makeZip } from '../../shared/index.ts';

/** "B\u00fchne.glb" with one composed character (NFC), as XML text usually holds it. */
const COMPOSED = 'B\u00fchne.glb';
/** The same name as macOS stores it: `u` and a combining diaeresis (NFD). */
const DECOMPOSED = 'Bu\u0308hne.glb';
const bytesOf = (...codes: number[]): Uint8Array =>
  Uint8Array.from([0x42, ...codes, 0x68, 0x6e, 0x65, 0x2e, 0x67, 0x6c, 0x62]);

describe('MvrArchive entry names', () => {
  it('reads a UTF-8 name that does not set the UTF-8 flag', () => {
    const archive = MvrArchive.open(makeRawNameZip([[COMPOSED, 'deck']]));
    expect(archive.names).toEqual([COMPOSED]);
    expect(archive.text(COMPOSED)).toBe('deck');
  });

  it('matches a decomposed name with a composed one, both ways', () => {
    expect(MvrArchive.open(makeZip({ [DECOMPOSED]: 'deck' })).text(COMPOSED)).toBe('deck');
    expect(MvrArchive.open(makeZip({ [COMPOSED]: 'deck' })).text(DECOMPOSED)).toBe('deck');
    expect(MvrArchive.open(makeRawNameZip([[DECOMPOSED, 'deck']])).text(COMPOSED.toUpperCase())).toBe('deck');
  });

  it('reads name bytes that are not UTF-8 as code page 437, and as Latin-1 when that is the name asked for', () => {
    const oem = MvrArchive.open(makeRawNameZip([[bytesOf(0x81), 'deck']]));
    expect(oem.names).toEqual([COMPOSED]);
    expect(oem.text(COMPOSED)).toBe('deck');
    const latin = MvrArchive.open(makeRawNameZip([[bytesOf(0xfc), 'deck']]));
    expect(latin.names).toEqual(['B\u207fhne.glb']);
    expect(latin.text(COMPOSED)).toBe('deck');
  });

  it('reads 0x80-0x9F as Windows-1252, not Latin-1, in the other reading', () => {
    const dash = Uint8Array.from([...new TextEncoder().encode('K2 '), 0x96, ...new TextEncoder().encode(' Line.gdtf')]);
    const archive = MvrArchive.open(makeRawNameZip([[dash, 'deck']]));
    expect(archive.altNames).toEqual(['K2 – Line.gdtf']);
    expect(archive.text('K2 – Line.gdtf')).toBe('deck');
  });

  it('finds a UTF-8 name by its code page 437 reading only when nothing else matches', () => {
    const mojibake = cp437(new TextEncoder().encode(COMPOSED));
    const archive = MvrArchive.open(makeRawNameZip([[COMPOSED, 'deck']]));
    expect(archive.text(mojibake)).toBe('deck');
    expect(cp437(Uint8Array.from([0x41, 0x80, 0xe1, 0xff]))).toBe('A\u00c7\u00df\u00a0');
  });

  it('uses neither of two files that match a name equally loosely', () => {
    const archive = MvrArchive.open(makeZip({ 'Deck.glb': 'a', 'DECK.glb': 'b' }));
    expect(archive.file('deck.glb')).toBeUndefined();
    expect(archive.ties('deck.glb')).toEqual(['Deck.glb', 'DECK.glb']);
    expect(archive.text('DECK.glb')).toBe('b');
    expect(archive.ties('DECK.glb')).toEqual([]);
  });
});
