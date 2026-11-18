import { houseResponse } from '../../domain/stage/showBalance';

/**
 * How much of the hall a full metal mirrors for the light the lit rig throws back, per unit of bounce radiance on a
 * white surface, and the most it adds: a truss over a lit stage shows its form with the house dark. In a show the
 * truss mirrors lit haze, LED walls and the deck, which together are about half as bright as the hall at full work
 * light. The first look of a real file bounces 0.012, so it gives a metal about 0.45 on top of the house.
 */
export const RIG_REFLECTION = 40;
export const RIG_REFLECTION_MAX = 0.8;
/**
 * The share of the hall a fixture body mirrors: a gloss black housing reflects 3 % of what it faces, so it reads by
 * its highlights alone. At 6 the highlight of a yoke under the first look is a dark grey, far under the lit deck.
 */
export const BODY_REFLECTION = 6;

/**
 * The level of the hall reflection of a surface with this `metalness`, as a share of the hall at full work light
 * (`createHallEnvironment`): the house control through its square law, plus for a metal the bounce of the lit rig.
 * A matt surface follows the house alone (its bounce is the surface light's), so the key-to-fill ratio of the
 * balance does not move with the rig. With the house at 0 and no light on stage it is 0: a blackout is black.
 */
export function hallLevel(houseLevel: number, bounceRadiance: number, metalness: number): number {
  const rig = Math.min(RIG_REFLECTION * Math.max(bounceRadiance, 0), RIG_REFLECTION_MAX);
  return houseResponse(houseLevel) + rig * Math.min(Math.max(metalness, 0), 1);
}
