import { DataTexture, EquirectangularReflectionMapping, LinearFilter, SRGBColorSpace } from 'three';

/** Size of the generated panorama: a blurry hall needs no detail, and the renderer prefilters it once. */
const WIDTH = 64;
const HEIGHT = 32;

/** Rows from the top of the panorama: the ceiling, the band of work lights under it, the walls, the floor. */
const CEILING = 0.12;
const LIGHT_BAND = 0.3;
const UPPER_WALL = 0.42;
const FLOOR = 0.55;

/**
 * sRGB levels (0-255) of the hall at FULL work light; `hallLevel` scales the reflection down to the house level.
 * The work lights are broad soft panels that fill half of their band, so a satin metal shows a long highlight and
 * not eight sparks; the walls are lighter near the lights than near the floor.
 */
const FLOOR_LEVEL = 40;
const WALL_LEVEL = 80;
const UPPER_WALL_LEVEL = 110;
const CEILING_LEVEL = 70;
const LIGHT_LEVEL = 255;
const LIGHTS = 6;

/** The sRGB level of the panorama at column `x` and row `y` (0 at the top). */
function level(x: number, y: number): number {
  const v = y / HEIGHT;
  if (v < CEILING) return CEILING_LEVEL;
  if (v < LIGHT_BAND) {
    const phase = (x / WIDTH) * LIGHTS;
    return Math.abs(phase - Math.round(phase)) < 0.25 ? LIGHT_LEVEL : UPPER_WALL_LEVEL;
  }
  if (v < UPPER_WALL) return UPPER_WALL_LEVEL;
  return v < FLOOR ? WALL_LEVEL : FLOOR_LEVEL;
}

/** The mean linear radiance of the panorama over the sphere: what a matt surface gets from it, about, at level 1. */
export function hallEnvironmentMean(): number {
  let [sum, weight] = [0, 0];
  for (let y = 0; y < HEIGHT; y += 1) {
    const solid = Math.sin(((y + 0.5) / HEIGHT) * Math.PI);
    for (let x = 0; x < WIDTH; x += 1) sum += solid * (level(x, y) / 255) ** 2.2;
    weight += solid * WIDTH;
  }
  return sum / weight;
}

/**
 * A small procedural environment of a hall, as an equirectangular panorama, for the specular light of metal scenery
 * and fixture bodies: a metal with nothing to reflect draws black. It is made in code (no image asset). No material
 * takes it as it is: `hallReflection` prefilters it once (PMREM, with a generator it frees at once), frees this
 * texture, and owns the one map that scenery and bodies share. It is never `scene.environment`: only materials of
 * an imported stage use the map, so the demo show draws exactly as before.
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
