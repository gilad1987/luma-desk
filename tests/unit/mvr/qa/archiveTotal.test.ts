/**
 * The 1 GiB total cap of `MvrArchive.open` with many small entries, each far below the 512 MiB entry cap. The
 * entries are stored, not deflated, so fflate copies their real bytes and the test never allocates the claimed size.
 */
import { zipSync } from 'fflate';
import { describe, expect, it } from 'vitest';
import { MvrArchive } from '../../../../src/mvr/archive/MvrArchive.ts';

const KIB_512 = 512 * 1024;

/** A ZIP of stored one-byte entries; `claims` maps a name to the uncompressed size its central header claims. */
function storedZip(names: readonly string[], claims: (name: string) => number): Uint8Array {
  const out = zipSync(Object.fromEntries(names.map((name) => [name, new Uint8Array([1])])), { level: 0 });
  const view = new DataView(out.buffer);
  const decoder = new TextDecoder();
  for (let at = 0; at + 46 <= out.byteLength; at++) {
    if (view.getUint32(at, true) !== 0x02014b50) continue;
    const name = decoder.decode(out.subarray(at + 46, at + 46 + view.getUint16(at + 28, true)));
    view.setUint32(at + 24, claims(name), true);
  }
  return out;
}

const names = (count: number, prefix = ''): string[] => Array.from({ length: count }, (_, i) => `${prefix}m${i}.3ds`);

describe('MvrArchive total size of many small entries', () => {
  it('refuses 2100 entries of 512 KiB each (1050 MiB together) with MvrError too-large', () => {
    const bytes = storedZip(names(2100), () => KIB_512);
    expect(() => MvrArchive.open(bytes)).toThrow(expect.objectContaining({ code: 'too-large' }));
  });

  it('opens 2048 entries of 512 KiB each, exactly 1 GiB together', () => {
    expect(MvrArchive.open(storedZip(names(2048), () => KIB_512)).names).toHaveLength(2048);
  });

  it('counts only kept entries: folder entries and entries `only` rejects add nothing', () => {
    const all = [...names(3, 'meshes/'), ...names(3), 'description.xml'];
    const bytes = storedZip(all, (name) => (name === 'description.xml' ? 1 : 400 * 2 ** 20));
    const archive = MvrArchive.open(bytes, { only: (name) => name === 'description.xml' });
    expect(archive.names).toEqual(['description.xml']);
  });
});
