/** An RGB colour with each channel in 0..1, the scale the colour picker and the fx engine compute in. */
export type Rgb01 = readonly [r: number, g: number, b: number];

/**
 * HSV (each 0..1) to RGB (0..1). The hue wraps (`-0.25` and `1.75` both give `0.75`), so a rainbow phase can run past
 * one turn without the caller reducing it first.
 *
 * @throws RangeError when `h * 6` is not finite (NaN, an infinite hue, or `|h|` above `Number.MAX_VALUE / 6`). The
 * original returned `undefined` there and every caller then failed on the first channel read; the error now names the
 * real cause at the source.
 */
export function hsv(h: number, s: number, v: number): Rgb01 {
  const i = Math.floor(h * 6),
    f = h * 6 - i,
    p = v * (1 - s),
    q = v * (1 - f * s),
    t = v * (1 - (1 - f) * s);
  const sectors: readonly Rgb01[] = [
    [v, t, p],
    [q, v, p],
    [p, v, t],
    [p, q, v],
    [t, p, v],
    [v, p, q],
  ];
  const rgb = sectors[((i % 6) + 6) % 6];
  if (rgb === undefined) throw new RangeError(`hsv: hue * 6 must be finite, got hue ${h}`);
  return rgb;
}

/**
 * RGB to HSV, with hue, saturation and value all in 0..1, so the result feeds `hsv` back unchanged.
 *
 * The colour marker in the MA panel still has an inline copy that keeps the hue in 0..6 and, for a red maximum with
 * `g < b`, wraps it as `(x + 6) % 6` where this function adds 1 after the divide. Both are equal in exact maths but can
 * differ by 1 ulp; that only reaches a CSS percentage, so switching the panel to this function is safe for screenshots.
 */
export function rgb2hsv(r: number, g: number, b: number): readonly [h: number, s: number, v: number] {
  const max = Math.max(r, g, b),
    min = Math.min(r, g, b),
    delta = max - min;
  let h = 0;
  // truthiness, not `!== 0`: a NaN channel must give hue 0 and saturation 0, as before
  if (delta) {
    if (max === r) h = ((g - b) / delta) % 6;
    else if (max === g) h = (b - r) / delta + 2;
    else h = (r - g) / delta + 4;
    h /= 6;
    if (h < 0) h += 1;
  }
  return [h, max ? delta / max : 0, max];
}

/**
 * CSS colour for channels in percent (0..100), the scale fixture attributes are stored in. It does not round:
 * `100 * 2.55` is `254.99999999999997` and the browser rounds it, so the painted pixels and the inline style strings
 * stay identical to the code this replaces.
 */
export function cssRgb(r: number, g: number, b: number): string {
  return `rgb(${r * 2.55},${g * 2.55},${b * 2.55})`;
}
