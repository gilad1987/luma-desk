import { Data3DTexture, LinearFilter, RedFormat, RepeatWrapping } from 'three';

const SIZE = 32;
const MODULUS = 2147483647;

/** A repeating lattice of `cells`^3 values from a fixed sequence (not Math.random): the same in every run. */
function lattice(cells: number, seed: number): (x: number, y: number, z: number) => number {
  const values = new Float32Array(cells * cells * cells);
  let state = seed;
  for (let i = 0; i < values.length; i++) {
    state = (state * 16807) % MODULUS;
    values[i] = state / MODULUS;
  }
  const at = (x: number, y: number, z: number): number =>
    values[(x % cells) + cells * ((y % cells) + cells * (z % cells))] ?? 0;
  const ease = (t: number): number => t * t * (3 - 2 * t);
  const mix = (a: number, b: number, t: number): number => a + (b - a) * t;
  // smooth interpolation between the lattice points, in lattice units; it wraps, so the texture tiles
  return (x, y, z) => {
    const [x0, y0, z0] = [Math.floor(x), Math.floor(y), Math.floor(z)];
    const [tx, ty, tz] = [ease(x - x0), ease(y - y0), ease(z - z0)];
    const row = (dy: number, dz: number): number => mix(at(x0, y0 + dy, z0 + dz), at(x0 + 1, y0 + dy, z0 + dz), tx);
    return mix(mix(row(0, 0), row(1, 0), ty), mix(row(0, 1), row(1, 1), ty), tz);
  };
}

/**
 * A small repeating 3D noise for the haze: one filtered fetch per layer and march step, where a procedural noise
 * would cost eight hashes. It is smooth noise at two sizes (lattices of 4 and 8 cells), not a random value per
 * texel: the filter turned that into blocks on the texel grid, which read as fixed blotches in a wide beam.
 */
export function createHazeNoise(): Data3DTexture {
  const data = new Uint8Array(SIZE * SIZE * SIZE);
  const coarse = lattice(4, 20261118);
  const fine = lattice(8, 7919);
  for (let z = 0, i = 0; z < SIZE; z++) {
    for (let y = 0; y < SIZE; y++) {
      for (let x = 0; x < SIZE; x++, i++) {
        const value = 0.6 * coarse(x / 8, y / 8, z / 8) + 0.4 * fine(x / 4, y / 4, z / 4);
        data[i] = Math.round(value * 255);
      }
    }
  }
  const texture = new Data3DTexture(data, SIZE, SIZE, SIZE);
  texture.format = RedFormat;
  texture.minFilter = LinearFilter;
  texture.magFilter = LinearFilter;
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.wrapR = RepeatWrapping;
  texture.needsUpdate = true;
  return texture;
}
