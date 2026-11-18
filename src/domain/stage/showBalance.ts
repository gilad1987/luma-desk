/**
 * The light balance of an imported stage, set the way a lighting designer sets a rig: the key on the performers is
 * the brightest light on stage, the tone colours the deck well below it, and the house is a dim work light. This is
 * the ONE place for the numbers that the first look (`show/mvrLook`), the hall light (`render/lights`) and the tests
 * of the balance share.
 */

/** What the first look asks of its two area lights, in level per cent times type power per square metre. */
export interface LookBalance {
  /** The key light on the band area. */
  readonly keyLux: number;
  /** The tone washes on the deck, as brightness seen: after the colour's luminance. */
  readonly toneLux: number;
}

/**
 * The balance in use. The key is set for the surface light of a real file, judged from the On Stage, Band and FOH
 * cameras: at 3 the band had a third of the light of the house at 30 and no figure threw a shadow; at 12 the
 * shadows were clear and the white shafts took over the haze. 10 gives a key of 5 to 1 over the house fill on a
 * performer (`keyIrradiance`, `hallRadiance`), inside the 3 to 6 of a stage picture.
 */
export const LOOK_BALANCE: LookBalance = { keyLux: 10, toneLux: 1.5 };

/**
 * The balance of the first look before the key was raised. A show saved with that look is still a starting show
 * (`isStartingShow` builds the look with this balance too), so a rig change may replace it.
 */
export const EARLIER_LOOK_BALANCE: LookBalance = { keyLux: 3, toneLux: 1.5 };

/**
 * The house level of a show state, 0..1: the default of the HOUSE control. With `houseResponse` it leaves the
 * audience readable and under the spill of the stage.
 */
export const HOUSE_SHOW_LEVEL = 0.3;

/**
 * The light of the hall for the HOUSE control (0..1), as a share of its full light: the square law of a stage
 * dimmer. The eye reads light by ratio, so on a linear control 30 was a third of a full work light, three times
 * the key; with the square law 30 is 9 %, a dim house, and 100 is the same work light as before.
 */
export function houseResponse(level: number): number {
  const held = Math.min(Math.max(level, 0), 1);
  return held * held;
}

/**
 * The most an LED wall may light the hall: what a white surface 15 m in front of a 14 x 9 m wall shows, with the
 * wall at its starting level and the content of the first look, as a share of the same surface under the key. A
 * wall at show level tints the first rows of the audience; it is never a second key.
 */
export const WALL_SPILL_LIMIT = 0.15;

/** The reference key of the balance: front light from 45 degrees over the audience (+z), the McCandless angle. */
const KEY_RISE = Math.SQRT1_2;
const KEY_FRONT = Math.SQRT1_2;

/**
 * The irradiance of the key on a surface with the unit normal `normal` in the band area, in scene units. `lux` is
 * level per cent times power per square metre of deck, so the deck gets lux / 100 and a surface that faces the key
 * more than the deck does gets more by the ratio of the cosines.
 */
export function keyIrradiance(lux: number, normal: readonly [number, number, number]): number {
  const facing = Math.max(normal[1] * KEY_RISE + normal[2] * KEY_FRONT, 0);
  return ((lux / 100) * facing) / KEY_RISE;
}
