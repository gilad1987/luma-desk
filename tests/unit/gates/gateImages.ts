import { readFileSync } from 'node:fs';
import { decodePng, IMAGE_BASELINE_DIR, type RgbaImage } from '../../shared';
import type { Rgb } from './imageEdits';

/** A committed baseline of the e2e image gate, decoded. */
export function baseline(name: string): RgbaImage {
  const url = new URL(`../../e2e/${IMAGE_BASELINE_DIR}/mvr-image-gate/${name}.png`, import.meta.url);
  return decodePng(readFileSync(url));
}

function image(width: number, height: number, colour: (x: number, y: number) => Rgb): RgbaImage {
  const data = new Uint8Array(width * height * 4);
  for (let p = 0; p < width * height; p++) data.set([...colour(p % width, Math.floor(p / width)), 255], p * 4);
  return { width, height, data };
}

/**
 * A stage-like picture: a dark house with a soft gradient, a grey deck, a warm white beam whose left edge is at
 * `edge`, and a saturated blue wash, so exposure, lightness and hue all have something to act on.
 */
export const stage = (edge = 64): RgbaImage =>
  image(320, 200, (x, y) => {
    if (x >= edge && x < edge + 24 && y < 120) return [235, 225, 200];
    if (x >= 200 && x < 260 && y >= 40 && y < 120) return [50, 110, 230];
    if (y >= 120 && y < 152) return [110, 104, 98];
    const g = 20 + Math.round((y / 200) * 30);
    return [g, g, g + 6];
  });

export interface Line {
  /** Left (or top) end of the line. */
  x: number;
  y: number;
  length: number;
  /** Thickness in pixels across the line. */
  width: number;
  vertical: boolean;
  rgb: Rgb;
}

/** A copy of `src` with an axis-aligned line drawn in, as a truss tube or a beam edge would be. */
export function withLine(src: RgbaImage, line: Line): RgbaImage {
  const data = new Uint8Array(src.data);
  for (let along = 0; along < line.length; along++) {
    for (let across = 0; across < line.width; across++) {
      const [x, y] = line.vertical ? [line.x + across, line.y + along] : [line.x + along, line.y + across];
      if (x < src.width && y < src.height) data.set(line.rgb, (y * src.width + x) * 4);
    }
  }
  return { ...src, data };
}

/** The row whose 6-row band over [x, x + length) is darkest: where a thin truss tube shows against the house. */
export function darkestRow(src: RgbaImage, x: number, length: number): number {
  const sum = (y: number): number => {
    let s = 0;
    for (let i = x; i < x + length; i++)
      for (let j = y; j < y + 6; j++) s += src.data[(j * src.width + i) * 4 + 1] ?? 0;
    return s;
  };
  let [best, row] = [Infinity, 0];
  for (let y = 2; y + 8 < src.height; y++) if (sum(y) < best) [best, row] = [sum(y), y + 2];
  return row;
}

/** `src` moved by (dx, dy) whole pixels; the strip it uncovers repeats the edge row or column. */
export function translated(src: RgbaImage, dx: number, dy: number): RgbaImage {
  const data = new Uint8Array(src.data.length);
  for (let y = 0; y < src.height; y++) {
    for (let x = 0; x < src.width; x++) {
      const [sx, sy] = [Math.min(src.width - 1, Math.max(0, x - dx)), Math.min(src.height - 1, Math.max(0, y - dy))];
      data.set(src.data.subarray((sy * src.width + sx) * 4, (sy * src.width + sx) * 4 + 4), (y * src.width + x) * 4);
    }
  }
  return { ...src, data };
}
