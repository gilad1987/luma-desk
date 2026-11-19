import { clamp } from '../../core';
import type { Chromaticity } from './chromaticity';

/** The range of the approximation, in kelvin. Outside it the temperature is limited to the nearest end. */
export const MIN_CCT = 1667;
export const MAX_CCT = 25000;
/** The colour temperature a NaN reads as: 6500 K, a near white. */
const NAN_CCT = 6500;

function xOf(t: number): number {
  if (t <= 4000) return -0.2661239e9 / t ** 3 - 0.2343589e6 / t ** 2 + 0.8776956e3 / t + 0.17991;
  return -3.0258469e9 / t ** 3 + 2.1070379e6 / t ** 2 + 0.2226347e3 / t + 0.24039;
}

function yOf(t: number, x: number): number {
  if (t < 2222) return -1.1063814 * x ** 3 - 1.3481102 * x ** 2 + 2.18555832 * x - 0.20219683;
  if (t <= 4000) return -0.9549476 * x ** 3 - 1.37418593 * x ** 2 + 2.09137015 * x - 0.16748867;
  return 3.081758 * x ** 3 - 5.8733867 * x ** 2 + 3.75112997 * x - 0.37001483;
}

/**
 * The chromaticity of a black body at a colour temperature, by the cubic spline of Kim et al. (Kang, Moon, Hong,
 * Lee, Cho and Kim, 2002, "Design of advanced color temperature control system for HDTV applications"). It is
 * valid from 1667 K to 25000 K and is within about 0.001 in x and y of the Planckian locus there. Its pieces meet
 * within 0.0001 at 4000 K and at 2222 K.
 *
 * It is the Planckian locus, not the daylight locus: a "5600 K" daylight source (CIE D series) lies a little to the
 * green side of this point.
 *
 * @param kelvin correlated colour temperature, limited to 1667..25000; NaN reads as `NAN_CCT` (6500 K, near the
 *   D65 white, the safe default for a colour)
 * @returns CIE 1931 xy
 */
export function cctToXy(kelvin: number): Chromaticity {
  const t = clamp(Number.isNaN(kelvin) ? NAN_CCT : kelvin, MIN_CCT, MAX_CCT);
  const x = xOf(t);
  return { x, y: yOf(t, x) };
}
