import { DataTexture, EquirectangularReflectionMapping, LinearFilter, SRGBColorSpace } from 'three';

/** Size of the generated panorama: a blurry hall needs no detail, and the renderer prefilters it once. */
const WIDTH = 64;
const HEIGHT = 32;

/** Rows from the top of the panorama: the ceiling, the band of house lights under it, the walls, the floor. */
const CEILING = 0.12;
const LIGHT_BAND = 0.2;
const FLOOR = 0.55;

/** sRGB levels (0-255) of a dark venue: near-black floor, dim walls, a darker ceiling and soft house-light pools. */
const FLOOR_LEVEL = 6;
const WALL_LEVEL = 22;
const CEILING_LEVEL = 14;
const LIGHT_LEVEL = 210;
const LIGHTS = 8;

/** The sRGB level of the panorama at column `x` and row `y` (0 at the top). */
function level(x: number, y: number): number {
  const v = y / HEIGHT;
  if (v < CEILING) return CEILING_LEVEL;
  if (v < LIGHT_BAND) {
    const phase = (x / WIDTH) * LIGHTS;
    return Math.abs(phase - Math.round(phase)) < 0.18 ? LIGHT_LEVEL : WALL_LEVEL;
  }
  return v < FLOOR ? WALL_LEVEL : FLOOR_LEVEL;
}

/**
 * A small procedural environment of a dark hall, as an equirectangular panorama, for the specular light of metal
 * scenery: a metal with nothing to reflect draws black. It is made in code (no image asset). Used as a material's
 * `envMap`, three's renderer prefilters it once (PMREM) and frees that copy when the texture is disposed, so the
 * caller owns only this texture. It is never `scene.environment`: only the scenery class looks of an imported stage
 * use it, so the demo show and the fixtures draw exactly as before.
 */
export function createHallEnvironment(): DataTexture {
  const data = new Uint8Array(WIDTH * HEIGHT * 4);
  for (let y = 0; y < HEIGHT; y += 1) {
    for (let x = 0; x < WIDTH; x += 1) {
      const value = level(x, y);
      // DataTexture rows run bottom-up (v = 0 is straight down), so row `y` from the top is stored from the end.
      data.set([value, value, value, 255], ((HEIGHT - 1 - y) * WIDTH + x) * 4);
    }
  }
  const texture = new DataTexture(data, WIDTH, HEIGHT);
  texture.mapping = EquirectangularReflectionMapping;
  texture.colorSpace = SRGBColorSpace;
  texture.magFilter = LinearFilter;
  texture.minFilter = LinearFilter;
  texture.needsUpdate = true;
  return texture;
}
