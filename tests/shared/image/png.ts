import { crc32, deflateSync, inflateSync } from 'node:zlib';
import { idatOf } from './pngChunks';

/** An 8-bit RGBA image, row by row from the top left. */
export interface RgbaImage {
  width: number;
  height: number;
  data: Uint8Array;
}

const SIGNATURE = [137, 80, 78, 71, 13, 10, 26, 10];
// colour type → channels: grey, RGB, grey+alpha, RGBA (no palette: Chromium screenshots never use one)
const CHANNELS: Readonly<Record<number, number>> = { 0: 1, 2: 3, 4: 2, 6: 4 };

function paeth(a: number, b: number, c: number): number {
  const p = a + b - c;
  const [pa, pb, pc] = [Math.abs(p - a), Math.abs(p - b), Math.abs(p - c)];
  if (pa <= pb && pa <= pc) return a;
  return pb <= pc ? b : c;
}

const PREDICT = [
  () => 0,
  (a: number) => a,
  (_a: number, b: number) => b,
  (a: number, b: number) => (a + b) >> 1,
  paeth,
];

/** Undoes the per-row PNG filters in place of a new buffer; `bpp` is bytes per pixel. */
function unfilter(raw: Uint8Array, width: number, height: number, bpp: number): Uint8Array {
  const stride = width * bpp;
  const out = new Uint8Array(stride * height);
  for (let y = 0; y < height; y++) {
    const row = y * (stride + 1);
    const predict = PREDICT[raw[row] ?? 0];
    if (!predict) throw new Error(`PNG row ${y}: unknown filter ${raw[row] ?? ''}`);
    for (let x = 0; x < stride; x++) {
      const i = y * stride + x;
      const a = x >= bpp ? (out[i - bpp] ?? 0) : 0;
      const b = y > 0 ? (out[i - stride] ?? 0) : 0;
      const c = x >= bpp && y > 0 ? (out[i - stride - bpp] ?? 0) : 0;
      out[i] = ((raw[row + 1 + x] ?? 0) + predict(a, b, c)) & 255;
    }
  }
  return out;
}

/**
 * Decodes an 8-bit, non-interlaced PNG (what Playwright writes) with Node's own zlib, so the gate needs no new
 * dependency. Grey and RGB are widened to RGBA; anything else throws rather than guess.
 */
export function decodePng(png: Uint8Array): RgbaImage {
  if (!SIGNATURE.every((b, i) => png[i] === b)) throw new Error('not a PNG');
  // the chunk walk checks every length and CRC, IHDR's own included, before the header is trusted
  const idat = idatOf(png);
  const view = new DataView(png.buffer, png.byteOffset, png.byteLength);
  const [width, height, depth, type, interlace] = [view.getUint32(16), view.getUint32(20), png[24], png[25], png[28]];
  const bpp = CHANNELS[type ?? -1];
  if (depth !== 8 || interlace !== 0 || !bpp) throw new Error(`unsupported PNG: depth ${depth}, type ${type}`);
  const pixels = unfilter(inflateSync(Buffer.concat(idat)), width, height, bpp);
  const data = new Uint8Array(width * height * 4);
  for (let p = 0; p < width * height; p++) {
    const s = p * bpp;
    const grey = bpp < 3;
    data[p * 4] = pixels[s] ?? 0;
    data[p * 4 + 1] = pixels[grey ? s : s + 1] ?? 0;
    data[p * 4 + 2] = pixels[grey ? s : s + 2] ?? 0;
    // the alpha byte is the last channel of grey+alpha and RGBA; the others are opaque
    data[p * 4 + 3] = bpp === 2 || bpp === 4 ? (pixels[s + bpp - 1] ?? 255) : 255;
  }
  return { width, height, data };
}

function chunk(kind: string, body: Uint8Array): Buffer {
  const head = Buffer.alloc(8);
  head.writeUInt32BE(body.length, 0);
  head.write(kind, 4, 'latin1');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([head.subarray(4), body])), 0);
  return Buffer.concat([head, body, crc]);
}

/** Encodes an RGBA image as a PNG with no row filter; only reports read it, so size does not matter. */
export function encodePng(image: RgbaImage): Uint8Array {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(image.width, 0);
  header.writeUInt32BE(image.height, 4);
  header.set([8, 6, 0, 0, 0], 8);
  const stride = image.width * 4;
  const raw = Buffer.alloc((stride + 1) * image.height);
  for (let y = 0; y < image.height; y++)
    raw.set(image.data.subarray(y * stride, (y + 1) * stride), y * (stride + 1) + 1);
  const parts = [Buffer.from(SIGNATURE), chunk('IHDR', header), chunk('IDAT', deflateSync(raw))];
  return new Uint8Array(Buffer.concat([...parts, chunk('IEND', new Uint8Array(0))]));
}
