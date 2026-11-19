/** A colour without its brightness: the CIE 1931 chromaticity coordinates x and y. */
export interface Chromaticity {
  readonly x: number;
  readonly y: number;
}

/** CIE 1931 tristimulus values; Y is the luminous quantity (lumens, candela, lux or nits, as the caller gives). */
export type Xyz = readonly [x: number, y: number, z: number];

/** The white of sRGB and Rec. 709: CIE standard illuminant D65, as IEC 61966-2-1 states it. */
export const D65: Chromaticity = { x: 0.3127, y: 0.329 };

/** Below this y the chromaticity is not a real colour and X / Y would divide by 0. */
const MIN_Y = 1e-6;

/** The chromaticity, or D65 (the safe default for a colour) when x or y is not finite. */
export function finiteChromaticity(xy: Chromaticity): Chromaticity {
  return Number.isFinite(xy.x) && Number.isFinite(xy.y) ? xy : D65;
}

/**
 * CIE xyY to XYZ: X = x Y / y, Z = (1 - x - y) Y / y. Source: the definition of the chromaticity coordinates.
 *
 * @param luminance Y, in any photometric unit; X and Z come back in the same unit. Not finite: 0 (no light); an
 *   xy that is not finite reads as D65
 */
export function xyYToXyz(xy: Chromaticity, luminance: number): Xyz {
  const colour = finiteChromaticity(xy);
  const amount = Number.isFinite(luminance) ? luminance : 0;
  const y = Math.max(colour.y, MIN_Y);
  return [(colour.x / y) * amount, amount, ((1 - colour.x - y) / y) * amount];
}

/**
 * XYZ back to chromaticity: x = X / (X + Y + Z), y = Y / (X + Y + Z). Black has no colour and reads as D65, and so
 * does a sum that is not finite.
 */
export function xyzToXy(xyz: Xyz): Chromaticity {
  const sum = xyz[0] + xyz[1] + xyz[2];
  return sum > 0 && Number.isFinite(sum) ? finiteChromaticity({ x: xyz[0] / sum, y: xyz[1] / sum }) : D65;
}
