import type { OpticsRgb, OpticsXyy } from '../../../domain/stage/optics/OpticsFunction';
import { intoSrgbGamut } from './srgbGamut';

/** Y of the GDTF white: "Default value: {0.3127, 0.3290, 100.0 } (white)". */
const WHITE_Y = 100;
/** Slack for rounding in the text of a file, so 100.000001 still reads as white. */
const SLACK = 1e-6;

/**
 * CIE XYZ (D65, Y of white = 1) to linear sRGB, rows R, G, B: the exact inverse of the IEC 61966-2-1 RGB-to-XYZ
 * matrix. It maps the GDTF white (x 0.3127, y 0.3290) to 0.99983, 1.00005, 1.00006, as that xy is rounded to 4
 * digits; after the division by the highest part the white is 1, 1, 1 within 3e-4.
 */
const XYZ_TO_SRGB: readonly (readonly [number, number, number])[] = [
  [3.2406255, -1.537208, -0.4986286],
  [-0.9689307, 1.8757561, 0.0415175],
  [0.0557101, -0.2040211, 1.0569959],
];

/**
 * A GDTF `ColorCIE` text ("floatx, floaty, floatY", CIE xyY 1931) as numbers. `undefined` when the text is not a
 * chromaticity: x and y must lie in the CIE diagram (x >= 0, y > 0, x + y <= 1) and Y in 0 to 100. Vectorworks
 * `Custom@` files write 0-255 RGB triples here ("255.0,31.0,0.0"), which this rule rejects.
 */
export function parseColorCie(text: string | undefined): OpticsXyy | undefined {
  const parts = (text ?? '').replace(/[{}]/g, '').split(',').map(Number);
  const [x, y, luminance] = parts;
  if (parts.length !== 3 || x === undefined || y === undefined || luminance === undefined) return undefined;
  if (!parts.every(Number.isFinite)) return undefined;
  const inDiagram = x >= 0 && y > 0 && x + y <= 1 + SLACK;
  return inDiagram && luminance >= 0 && luminance <= WHITE_Y + SLACK ? [x, y, luminance] : undefined;
}

/**
 * CIE xyY to linear sRGB with the D65 white point: xyY -> XYZ (X = xY/y, Z = (1-x-y)Y/y, Y scaled so that 100 is
 * 1), then the IEC 61966-2-1 matrix. Colours outside the sRGB gamut are clipped in two stated steps. First, a
 * chromaticity outside the sRGB triangle moves to the nearest point of its edge in u'v' (`intoSrgbGamut`), with the
 * same Y; the rounding of the matrix can leave a part a hair under 0, which is set to 0. Then, when a part is above
 * 1, all three are divided by the highest: the chromaticity is kept and the luminance drops.
 */
export function xyyToLinearSrgb(xyy: OpticsXyy): OpticsRgb {
  const [, y, luminance] = xyy;
  const bigY = luminance / WHITE_Y;
  if (y <= 0 || bigY <= 0) return [0, 0, 0];
  const [gx, gy] = intoSrgbGamut([xyy[0], y]);
  const xyz = [(gx * bigY) / gy, bigY, ((1 - gx - gy) * bigY) / gy] as const;
  const raw = XYZ_TO_SRGB.map((row) => row[0] * xyz[0] + row[1] * xyz[1] + row[2] * xyz[2]);
  const inGamut = raw.map((part) => Math.max(0, part));
  const high = Math.max(...inGamut, 1);
  const [r = 0, g = 0, b = 0] = inGamut.map((part) => Math.min(1, Math.max(0, part / high)));
  return [r, g, b];
}
