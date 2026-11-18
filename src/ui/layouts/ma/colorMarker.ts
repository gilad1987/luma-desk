/**
 * Where the colour marker sits on the hue/saturation pad, in percent. Kept inline instead of core `rgb2hsv`: that
 * changes the last digits of `style.left` for about 17% of inputs, which the screenshots would show.
 */
export function colorMarker(r: number, g: number, b: number): { readonly left: number; readonly top: number } {
  const max = Math.max(r, g, b),
    spread = max - Math.min(r, g, b);
  return { left: (hueSixths(r, g, b, spread) / 6) * 100, top: (1 - (max ? spread / max : 0)) * 100 };
}

/** Hue in sixths of the circle (0 to 6), with the same operation order as the original. */
function hueSixths(r: number, g: number, b: number, spread: number): number {
  if (!spread) return 0;
  const max = Math.max(r, g, b);
  if (max === r) return ((g - b) / spread + 6) % 6;
  if (max === g) return (b - r) / spread + 2;
  return (r - g) / spread + 4;
}
