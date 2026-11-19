import type { StageBounds } from '../../../domain/stage/types';

/** Metres between the box of stage and seats and a side wall, at least; a wide plot gets a quarter of its width. */
const SIDE_MARGIN = 8;
const SIDE_SHARE = 0.25;
/** Metres behind the last seat row and behind the stage, at least; a deep plot gets a fifth of its depth. */
const END_MARGIN = 8;
const END_SHARE = 0.2;
/** Metres from the top of the rig to the ceiling, and the lowest ceiling of a hall that holds a show. */
const HEADROOM = 6;
const MIN_HEIGHT = 12;

/**
 * The base colour of the walls and the ceiling, sRGB: a dark matt grey with about 15 % reflectance, as the painted
 * walls of a venue. Under the house at its show level a wall is under 3 % of a white surface under the key, so it
 * gives the space depth without ever standing beside the stage as a lit thing.
 */
export const HALL_SHELL_COLOR = 0x6c6c70;
/**
 * The base colour of the floor inside the walls, sRGB: 10 % reflectance, a dark hall floor. It is an opaque surface
 * with a colour of its own, so the light pass lands beams on it as pools, and under the house it is a readable
 * plane a little over 3 % of the key: a rig with no scenery stands on something.
 */
export const HALL_FLOOR_COLOR = 0x5a5a5e;
/**
 * Metres of the floor under the imported ground level (y 0, where the fit puts the lowest scenery or fixture and
 * where beams land): over the fading ground disc of the venue, under a floor mesh of the file.
 */
export const HALL_FLOOR_DROP = 0.03;

/**
 * Whether the stage on screen shows a hall of its own: a layer the import judged the venue hall (`isHallLayer`: by
 * its name, as a hall structure, or as a box that surrounds the rig) that is not among the `hidden` layers. Only then
 * the desk adds no shell: an open-air file, a file of fixtures alone and a file whose hall is hidden all stand in a
 * black void without one.
 */
export function showsFileHall(hallLayers: readonly string[], hidden: readonly string[]): boolean {
  return hallLayers.some((uuid) => !hidden.includes(uuid));
}

/**
 * The inside of the desk-made hall around `box` (the box of stage and seats, metres): from the desk floor at y 0 to
 * a ceiling over the rig, with room at the sides and the ends, so no wall cuts through the plot or its beams.
 */
export function hallShellBox(box: StageBounds): StageBounds {
  const [x0, , z0] = box.min;
  const [x1, y1, z1] = box.max;
  const side = Math.max(SIDE_MARGIN, SIDE_SHARE * (x1 - x0));
  const end = Math.max(END_MARGIN, END_SHARE * (z1 - z0));
  return { min: [x0 - side, 0, z0 - end], max: [x1 + side, Math.max(MIN_HEIGHT, y1 + HEADROOM), z1 + end] };
}
