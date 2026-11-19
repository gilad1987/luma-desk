/**
 * The radical inverse of `index` in `base`: one coordinate of the Halton sequence. The still renderer uses bases 2
 * and 3 for the pixel jitter and 5 and 7 for the lens point, so the two never correlate (a shared base would tie the
 * lens position to the sub-pixel position and draw a pattern instead of noise).
 */
export function halton(index: number, base: number): number {
  let result = 0;
  let fraction = 1 / base;
  let rest = index;
  while (rest > 0) {
    result += (rest % base) * fraction;
    rest = Math.floor(rest / base);
    fraction /= base;
  }
  return result;
}
