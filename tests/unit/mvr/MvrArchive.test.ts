import { describe, expect, it } from 'vitest';
import { MvrArchive } from '../../../src/mvr/archive/MvrArchive.ts';
import { MvrError } from '../../../src/mvr/MvrWarning.ts';
import { makeMvr, makeZip } from '../../shared/index.ts';

const SCENE = '<GeneralSceneDescription verMajor="1" verMinor="6"/>';

describe('MvrArchive', () => {
  it('lists root-level names as stored, in archive order', () => {
    const archive = MvrArchive.open(makeMvr(SCENE, { 'Robe Spiider.gdtf': 'x', 'mesh.glb': new Uint8Array([1]) }));
    expect(archive.names).toEqual(['GeneralSceneDescription.xml', 'Robe Spiider.gdtf', 'mesh.glb']);
  });

  it('skips files inside folders', () => {
    const archive = MvrArchive.open(makeZip({ 'a.xml': '1', 'sub/b.xml': '2' }));
    expect(archive.names).toEqual(['a.xml']);
    expect(archive.file('sub/b.xml')).toBeUndefined();
  });

  it('finds files without regard to case', () => {
    const archive = MvrArchive.open(makeMvr(SCENE, { 'Robe Spiider.gdtf': 'gdtf' }));
    expect(archive.text('generalscenedescription.XML')).toBe(SCENE);
    expect(archive.text('ROBE SPIIDER.GDTF')).toBe('gdtf');
  });

  it('uses neither of two names that differ only in case when the name asked for is a third form', () => {
    const archive = MvrArchive.open(makeZip({ 'A.txt': 'first', 'a.txt': 'second' }));
    expect(archive.text('a.TXT')).toBeUndefined();
    expect(archive.ties('a.TXT')).toEqual(['A.txt', 'a.txt']);
  });

  it('returns the stored bytes unchanged', () => {
    const bytes = new Uint8Array([0, 255, 7]);
    expect(MvrArchive.open(makeZip({ 'm.3ds': bytes })).file('M.3DS')).toEqual(bytes);
  });

  it('decodes text as UTF-8', () => {
    const archive = MvrArchive.open(makeZip({ 'he.xml': '<a>במה</a>' }));
    expect(archive.text('he.xml')).toBe('<a>במה</a>');
  });

  it('returns undefined for a missing file', () => {
    const archive = MvrArchive.open(makeMvr(SCENE));
    expect(archive.file('missing.gdtf')).toBeUndefined();
    expect(archive.text('missing.gdtf')).toBeUndefined();
  });

  it.each([
    ['plain text', new TextEncoder().encode('not a zip at all')],
    ['empty bytes', new Uint8Array(0)],
  ])('throws MvrError not-zip for %s', (_label, bytes) => {
    expect(() => MvrArchive.open(bytes)).toThrow(MvrError);
    expect(() => MvrArchive.open(bytes)).toThrow(expect.objectContaining({ code: 'not-zip' }));
  });
});
