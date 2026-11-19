import { xyYToXyz, type Chromaticity, type Xyz } from './chromaticity';
import { finiteOr } from './finite';

/** Linear light in the sRGB primaries (not gamma encoded). A value below 0 means the colour is outside the gamut. */
export type LinearRgb = readonly [r: number, g: number, b: number];

type Row = readonly [number, number, number];
type Matrix = readonly [Row, Row, Row];

/**
 * Linear sRGB to XYZ, derived in exact arithmetic from the definition in IEC 61966-2-1: the Rec. 709 primaries
 * (0.64, 0.33), (0.30, 0.60), (0.15, 0.06) and the D65 white (0.3127, 0.3290). The 4-digit matrix printed in the
 * standard is this one rounded; the full digits keep white at exactly (1, 1, 1) and make the two matrices true
 * inverses. The test derives it again from the primaries.
 */
const RGB_TO_XYZ: Matrix = [
  [0.412390799266, 0.357584339384, 0.180480788402],
  [0.212639005872, 0.715168678768, 0.072192315361],
  [0.019330818716, 0.119194779795, 0.95053215225],
];

/** XYZ to linear sRGB: the inverse of `RGB_TO_XYZ`. */
const XYZ_TO_RGB: Matrix = [
  [3.240969941905, -1.53738317757, -0.498610760293],
  [-0.969243636281, 1.875967501508, 0.041555057407],
  [0.055630079697, -0.203976958889, 1.056971514243],
];

/** A channel or tristimulus value that is not finite reads as 0, no light (see `finiteOr`). */
function finiteRow(v: Row): Row {
  return [finiteOr(v[0], 0), finiteOr(v[1], 0), finiteOr(v[2], 0)];
}

function apply(matrix: Matrix, input: Row): [number, number, number] {
  const v = finiteRow(input);
  const row = (r: Row): number => r[0] * v[0] + r[1] * v[1] + r[2] * v[2];
  return [row(matrix[0]), row(matrix[1]), row(matrix[2])];
}

/** XYZ (D65) to linear sRGB. No clamp: an out-of-gamut colour keeps its negative channel (see `mapToSrgbGamut`). */
export function xyzToLinearSrgb(xyz: Xyz): LinearRgb {
  return apply(XYZ_TO_RGB, xyz);
}

/** Linear sRGB to XYZ (D65). */
export function linearSrgbToXyz(rgb: LinearRgb): Xyz {
  return apply(RGB_TO_XYZ, rgb);
}

/**
 * The luminance of a linear sRGB colour: Y = 0.2126 R + 0.7152 G + 0.0722 B (the Y row of `RGB_TO_XYZ`). It is in
 * the unit the channels are in: nits for a radiance, candela for an intensity.
 */
export function relativeLuminance(rgb: LinearRgb): number {
  return apply(RGB_TO_XYZ, rgb)[1];
}

/**
 * CIE xyY straight to linear sRGB.
 *
 * @param luminance Y in any photometric unit; `relativeLuminance` of the result gives it back
 */
export function xyYToLinearSrgb(xy: Chromaticity, luminance: number): LinearRgb {
  return xyzToLinearSrgb(xyYToXyz(xy, luminance));
}
