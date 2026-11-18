import { crc32 } from 'node:zlib';

/**
 * The concatenated IDAT bodies of a PNG, read chunk by chunk from byte 8 up to IEND. Every chunk is checked: a chunk
 * that runs past the end of the file and a CRC that does not match throw a clear error, and so does a file without
 * IEND, so a damaged baseline fails as damaged instead of as a picture change. Bytes after IEND are ignored.
 */
export function idatOf(png: Uint8Array): Uint8Array[] {
  const view = new DataView(png.buffer, png.byteOffset, png.byteLength);
  const idat: Uint8Array[] = [];
  for (let at = 8; at + 12 <= png.length;) {
    const len = view.getUint32(at);
    const kind = String.fromCharCode(...png.subarray(at + 4, at + 8));
    if (at + 12 + len > png.length) {
      throw new Error(`PNG chunk ${kind} at byte ${at} is truncated: ${len} bytes, ${png.length - at - 12} left`);
    }
    if (crc32(png.subarray(at + 4, at + 8 + len)) !== view.getUint32(at + 8 + len)) {
      throw new Error(`PNG chunk ${kind} at byte ${at} has a wrong CRC`);
    }
    if (kind === 'IEND') return idat;
    if (kind === 'IDAT') idat.push(png.subarray(at + 8, at + 8 + len));
    at += 12 + len;
  }
  throw new Error('PNG ends without an IEND chunk (truncated file)');
}
