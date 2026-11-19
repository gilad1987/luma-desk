/**
 * `MvrArchive.open` limits: callers can unpack a subset, an entry that claims more than 512 MiB is refused before it
 * is inflated, and a broken ZIP says what fflate found instead of a bare "not a ZIP".
 */
import { describe, expect, it } from 'vitest';
import { MvrArchive } from '../../../src/mvr/archive/MvrArchive.ts';
import { makeZip } from '../../shared/index.ts';

/** `bytes` with the uncompressed size in every central directory header set to `size`. */
function claimSize(bytes: Uint8Array, size: number): Uint8Array {
  const out = bytes.slice();
  const view = new DataView(out.buffer);
  for (let at = 0; at + 46 <= out.byteLength; at++) {
    if (view.getUint32(at, true) === 0x02014b50) view.setUint32(at + 24, size, true);
  }
  return out;
}

describe('MvrArchive limits', () => {
  it('unpacks only the names `only` accepts', () => {
    const archive = MvrArchive.open(makeZip({ 'description.xml': 'x', 'mesh.glb': 'y' }), {
      only: (name) => name === 'description.xml',
    });
    expect([archive.names, archive.file('mesh.glb')]).toEqual([['description.xml'], undefined]);
  });

  it('refuses an entry that claims more than 512 MiB with MvrError too-large', () => {
    const bytes = claimSize(makeZip({ 'bomb.3ds': 'x' }), 0x40000000);
    expect(() => MvrArchive.open(bytes)).toThrow(expect.objectContaining({ code: 'too-large' }));
  });

  it('refuses entries that claim more than 1 GiB together with MvrError too-large', () => {
    const files = { 'a.3ds': 'x', 'b.3ds': 'y', 'c.3ds': 'z' };
    const bytes = claimSize(makeZip(files), 400 * 2 ** 20);
    expect(() => MvrArchive.open(bytes)).toThrow(expect.objectContaining({ code: 'too-large' }));
  });

  it('reads the exact name before a name that differs only in case', () => {
    const archive = MvrArchive.open(makeZip({ 'a.gdtf': 'lower', 'A.gdtf': 'upper' }));
    const text = (name: string): string | undefined => archive.text(name);
    expect([text('A.gdtf'), text('a.gdtf'), text('A.GDTF')]).toEqual(['upper', 'lower', undefined]);
  });

  it('names the ZIP problem in the not-zip message', () => {
    const bytes = makeZip({ 'a.txt': 'x' }).slice(0, -10);
    expect(() => MvrArchive.open(bytes)).toThrow(expect.objectContaining({ code: 'not-zip' }));
    expect(() => MvrArchive.open(bytes)).toThrow(/not a readable ZIP archive \(.+\)/);
  });
});
