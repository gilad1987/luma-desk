/** A direction or a colour as three numbers. */
export type Triple = readonly [number, number, number];

/**
 * A unit world normal as the three bytes of the normal buffer: `n * 0.5 + 0.5`, rounded as the GPU rounds a
 * colour. This is the code of `surface.frag.glsl`; it lives here too so the size of its error is a tested number.
 */
export function encodeNormal([x, y, z]: Triple): Triple {
  const byte = (value: number): number => Math.round(Math.min(Math.max(value * 0.5 + 0.5, 0), 1) * 255);
  return [byte(x), byte(y), byte(z)];
}

/** The unit normal a reader gets back from the three bytes: `normalize(rgb * 2 - 1)`. */
export function decodeNormal([r, g, b]: Triple): Triple {
  const x = (r / 255) * 2 - 1;
  const y = (g / 255) * 2 - 1;
  const z = (b / 255) * 2 - 1;
  const size = Math.hypot(x, y, z) || 1;
  return [x / size, y / size, z / size];
}
