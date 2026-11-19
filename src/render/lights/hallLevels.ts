import { HOUSE_SHOW_LEVEL, LOOK_BALANCE, houseResponse, keyIrradiance } from '../../domain/stage/showBalance';
import { SURFACE_GAIN } from '../lighting/surfacePhotometry';

type Normal = readonly [number, number, number];

/**
 * Intensities of the hall light at House 100 (the house control scales them through `houseResponse`). ACES Filmic
 * flattens values past about sRGB 230, so a pale matte top face sits near sRGB 200 here and beams still read
 * brighter than it.
 */
export const HALL_FILL = 0.9;
/**
 * The three high work lights: the level, and the place as a share of the hall span to the side (`dx`) and towards
 * the audience (`dz`). The audience is +z: key from front left, side from front right, back from behind the stage.
 */
export const HALL_LIGHTS = {
  key: { level: 1.9, dx: -0.4, dz: 0.6 },
  side: { level: 1.15, dx: 0.5, dz: 0.4 },
  back: { level: 0.65, dx: 0, dz: -0.7 },
} as const;
/** How high over the top of the hall the work lights hang, as a share of its span. */
export const HALL_RISE = 0.8;

/**
 * The radiance of a white matt surface with the unit normal `normal` under the hall light at the house level
 * `house` (0..1), in the units of the HDR scene target: the hemisphere fill plus the three work lights, each over
 * pi as the renderer has it. It takes the lights as white and as high as `HALL_RISE` alone (the real ones are a
 * little warm and hang half a hall height higher); a face up gets 1.18 at House 100 and a face to the audience 0.62.
 */
export function hallRadiance(house: number, normal: Normal): number {
  const [nx, ny, nz] = normal;
  let sum = HALL_FILL * (0.5 + 0.5 * ny);
  for (const { level, dx, dz } of Object.values(HALL_LIGHTS))
    sum += (level * Math.max(nx * dx + ny * HALL_RISE + nz * dz, 0)) / Math.hypot(dx, HALL_RISE, dz);
  return (houseResponse(house) * sum) / Math.PI;
}

/**
 * The key-to-fill ratio of the balance on a white surface with this normal in the band area: the radiance from the
 * key of the first look over that from the house at `house`. A stage picture wants 3 to 6 on a performer.
 */
export function keyToHouse(normal: Normal, house = HOUSE_SHOW_LEVEL): number {
  return (SURFACE_GAIN * keyIrradiance(LOOK_BALANCE.keyLux, normal)) / hallRadiance(house, normal);
}
