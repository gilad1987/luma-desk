// Oklab both ways (Ottosson 2020), written apart from tests/shared/image/oklab.ts on purpose: the edits that build the
// gate's test cases then do not lean on the code under test.
export type Rgb = readonly [number, number, number];

export const toLinear = (c: number): number => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const toSrgb = (l: number): number => (l <= 0.0031308 ? l * 12.92 : 1.055 * Math.max(0, l) ** (1 / 2.4) - 0.055);
/** Linear light back to an 8-bit sRGB level, clipped to 0..255; `dither` (in 8-bit steps) is added before rounding. */
export const level = (linear: number, dither = 0): number =>
  Math.max(0, Math.min(255, Math.round(toSrgb(linear) * 255 + dither)));

/** 8-bit sRGB to Oklab L, a, b. */
export function toOklab([r8, g8, b8]: Rgb): Rgb {
  const [r, g, b] = [toLinear(r8 / 255), toLinear(g8 / 255), toLinear(b8 / 255)];
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

/** Oklab back to linear-light RGB, not clipped: a channel outside 0..1 is a colour the sRGB gamut does not hold. */
function linearFromOklab([l0, a, b]: Rgb): Rgb {
  const l = (l0 + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (l0 - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (l0 - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const r = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  return [r, g, -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s];
}

// an 8-bit colour taken to Oklab and back lands this close to 0..1, not on it
const ROUND_TRIP = 1e-6;
const fits = (rgb: Rgb): boolean => rgb.every((v) => v >= -ROUND_TRIP && v <= 1 + ROUND_TRIP);

/**
 * Oklab to linear light inside the sRGB gamut, at the same lightness and hue: a colour outside loses chroma until it
 * fits (the gamut mapping of CSS Color 4), so clipping one channel does not bend its hue. Grey always fits.
 */
export function gamutFitted([l, a, b]: Rgb): Rgb {
  const at = (k: number): Rgb => linearFromOklab([l, a * k, b * k]);
  if (fits(at(1))) return at(1);
  let [inside, outside] = [0, 1];
  for (let step = 0; step < 24; step++) {
    const k = (inside + outside) / 2;
    if (fits(at(k))) inside = k;
    else outside = k;
  }
  return at(inside);
}
