/**
 * Stateless pseudo-random value in [0, 1) for an input number, the shader-style `fract(sin(n * 127.1 + 311.7) * k)`.
 * Effects use it so the same step and fixture always give the same flash, with no stream to carry between frames. The
 * exact expression is kept because the result depends on `Math.sin` rounding.
 */
export function hash(n: number): number {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

/**
 * Seeded random stream in [0, 1) (mulberry32). Gobo textures are drawn from it so every load paints the same pattern.
 * Each call returns an independent stream that owns its own copy of the seed.
 */
export function rng(seed: number): () => number {
  let state = seed;
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
