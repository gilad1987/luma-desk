import { describe, expect, it } from 'vitest';
import { decodePng, encodePng } from '../../shared';

// A damaged baseline must fail as damaged, with the chunk named, never as a changed picture.
const image = { width: 3, height: 2, data: new Uint8Array(Array.from({ length: 24 }, (_, i) => (i * 37) % 256)) };
const png = encodePng(image);
// encodePng writes IHDR at byte 8, then IDAT, then the 12-byte IEND
const iendAt = png.length - 12;

describe('decodePng', () => {
  it('reads back what encodePng wrote', () => {
    expect(decodePng(png)).toEqual(image);
  });

  it('stops at IEND and ignores bytes after it', () => {
    const tail = new Uint8Array([...png, 0, 0, 0, 99, 1, 2, 3]);
    expect(decodePng(tail)).toEqual(image);
  });

  it('names a chunk that runs past the end of the file', () => {
    expect(() => decodePng(png.subarray(0, iendAt - 5))).toThrow(/chunk IDAT at byte \d+ is truncated/);
  });

  it('names a file that ends without IEND', () => {
    expect(() => decodePng(png.subarray(0, iendAt))).toThrow(/without an IEND/);
  });

  it('verifies every CRC', () => {
    const damaged = new Uint8Array(png);
    // one bit of the IDAT body, which zlib alone might still inflate to a picture
    damaged[33 + 8 + 4] = (damaged[33 + 8 + 4] ?? 0) ^ 1;
    expect(() => decodePng(damaged)).toThrow(/IDAT at byte 33 has a wrong CRC/);
  });

  it('still rejects a file that is not a PNG', () => {
    expect(() => decodePng(new Uint8Array(40))).toThrow(/not a PNG/);
  });
});
