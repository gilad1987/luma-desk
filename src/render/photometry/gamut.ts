import { D65, finiteChromaticity, type Chromaticity } from './chromaticity';
import { xyzToLinearSrgb } from './srgb';

/** A channel this little below 0 is rounding, not a colour outside the gamut. */
const TOLERANCE = 1e-9;

type Uv = readonly [u: number, v: number];

/** CIE 1976 UCS: u' = 4x / (-2x + 12y + 3), v' = 9y / (-2x + 12y + 3). Source: CIE 15:2004. */
function toUv(xy: Chromaticity): Uv {
  const d = -2 * xy.x + 12 * xy.y + 3;
  return [(4 * xy.x) / d, (9 * xy.y) / d];
}

/** The inverse: x = 9u' / (6u' - 16v' + 12), y = 4v' / (6u' - 16v' + 12). */
function fromUv(uv: Uv): Chromaticity {
  const d = 6 * uv[0] - 16 * uv[1] + 12;
  return { x: (9 * uv[0]) / d, y: (4 * uv[1]) / d };
}

/** The sRGB (Rec. 709) primaries in u'v' and the three edges of their triangle. */
const RED = toUv({ x: 0.64, y: 0.33 });
const GREEN = toUv({ x: 0.3, y: 0.6 });
const BLUE = toUv({ x: 0.15, y: 0.06 });
const EDGES: readonly (readonly [Uv, Uv])[] = [
  [RED, GREEN],
  [GREEN, BLUE],
  [BLUE, RED],
];

/** The three channels for XYZ = (x, y, 1 - x - y): their signs are those of the colour at any brightness. */
function channelsOf(xy: Chromaticity): readonly number[] {
  return xyzToLinearSrgb([xy.x, xy.y, 1 - xy.x - xy.y]);
}

/** True when a display with the sRGB primaries can show the chromaticity (no channel is negative). */
export function isInSrgbGamut(xy: Chromaticity): boolean {
  return channelsOf(xy).every((value) => value >= -TOLERANCE);
}

/**
 * The direction of a chromaticity from the D65 white in the xy diagram, in radians. All colours on one line from
 * white have the same dominant wavelength. `mapToSrgbGamut` does not keep it: it keeps the saturation instead.
 */
export function hueAngle(xy: Chromaticity): number {
  const colour = finiteChromaticity(xy);
  return Math.atan2(colour.y - D65.y, colour.x - D65.x);
}

/** The point of the segment a..b nearest to p, and the squared distance to it. */
function nearestOnEdge(p: Uv, a: Uv, b: Uv): readonly [point: Uv, distanceSquared: number] {
  const eu = b[0] - a[0];
  const ev = b[1] - a[1];
  const t = Math.min(Math.max(((p[0] - a[0]) * eu + (p[1] - a[1]) * ev) / (eu * eu + ev * ev), 0), 1);
  const point: Uv = [a[0] + t * eu, a[1] + t * ev];
  return [point, (point[0] - p[0]) ** 2 + (point[1] - p[1]) ** 2];
}

/**
 * The nearest chromaticity on the edge of the sRGB triangle, measured in CIE 1976 u'v'. A saturated LED (deep
 * green, blue, red) is outside the triangle: one channel is negative, and a clamp of that channel alone would
 * change the luminance. A move toward D65 keeps the dominant wavelength but turns an LED green into a mint; the
 * nearest edge point keeps the colour as saturated as the display can show it, so a lighting designer sees a deep
 * green. u'v' is near uniform in perceived colour difference, so "nearest" there is close to "looks most alike".
 * The point moves continuously across the edge. Luminance is not part of xy: the caller keeps Y. Do it once per
 * emitter mix, not per pixel.
 *
 * @returns the same object when the colour is already inside; D65 for a y of 0 or less, or an x or y that is not
 *   finite (not a colour)
 */
export function mapToSrgbGamut(xy: Chromaticity): Chromaticity {
  if (!(xy.y > 0) || finiteChromaticity(xy) !== xy) return D65;
  if (isInSrgbGamut(xy)) return xy;
  const p = toUv(xy);
  let best: Uv = RED;
  let bestDistance = Infinity;
  for (const [a, b] of EDGES) {
    const [point, distance] = nearestOnEdge(p, a, b);
    if (distance < bestDistance) [best, bestDistance] = [point, distance];
  }
  // an xy far outside the spectrum locus can put the u'v' denominator at 0: no colour, so white
  return finiteChromaticity(fromUv(best));
}
