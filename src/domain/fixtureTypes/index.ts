import type { FixtureType, FixtureTypeId } from '../FixtureType';
import { MOVING_TYPES } from './movingTypes';
import { STATIC_TYPES } from './staticTypes';

/** Every fixture type by key, joined in the original table order so any iteration over it keeps today's order. */
export const TYPES: Readonly<Record<FixtureTypeId, FixtureType>> = {
  spot: MOVING_TYPES.spot,
  beam: MOVING_TYPES.beam,
  wash: MOVING_TYPES.wash,
  par: STATIC_TYPES.par,
  blinder: STATIC_TYPES.blinder,
  strobe: STATIC_TYPES.strobe,
  bar: MOVING_TYPES.bar,
  follow: MOVING_TYPES.follow,
  profile: STATIC_TYPES.profile,
  screen: STATIC_TYPES.screen,
};
