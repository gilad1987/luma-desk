/**
 * The input policy of the photometry module, one rule for every public function: no public function returns NaN or
 * Infinity unless its doc comment says so.
 * - A magnitude (flux, intensity, luminance, an amount) that is NaN or infinite gives no light: 0.
 * - A length that is NaN gives 0 light; an infinite one gives the limit where it is finite (I / d^2 is 0 at
 *   d = Infinity), else 0.
 * - A shape (an angle, a colour, a zoom position, an asymmetry) that is NaN reads as the safe default its doc
 *   comment names; an infinite one is limited to its range like any value outside it.
 * The branded unit constructors (`lumens`, `candela`, `lux`, `nits`) turn NaN into 0 and keep Infinity, which a
 * caller may mean as "no limit" (the documented exception).
 */
export function finiteOr(value: number, fallback: number): number {
  return Number.isFinite(value) ? value : fallback;
}
