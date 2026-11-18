import type { FixtureTypeId } from '../FixtureType';

/** How far a desk model's origin sits from its mounting point, in metres, in each pose the desk draws it. */
export interface MountHeight {
  /** Hung pose, and any pose with a body rotation: from the top of the base down to the model origin. */
  readonly hang: number;
  /** Floor rest pose: from the floor up to the origin; a mover stands on its base, a static unit on its stand. */
  readonly floor: number;
}

/**
 * The mounting-point distance of every desk model, already scaled by its `T.size`. The models are built with the
 * tilt axis at the origin, but an MVR fixture's insertion point is where it is clamped or stands, so the import and
 * the export move by this distance along the body's base axis. Measured from the built models: a unit test pins
 * each value against the model's real bounding box, so a model change cannot drift from it silently. The screen has
 * no model, so its origin is its mounting point.
 */
export const MOUNT_HEIGHTS: Readonly<Record<FixtureTypeId, MountHeight>> = {
  spot: { hang: 0.785, floor: 0.785 },
  beam: { hang: 0.632, floor: 0.632 },
  wash: { hang: 0.785, floor: 0.785 },
  par: { hang: 0.239, floor: 0.374 },
  blinder: { hang: 0.654, floor: 0.654 },
  strobe: { hang: 0.55, floor: 0.55 },
  bar: { hang: 0.344, floor: 0.344 },
  follow: { hang: 0.785, floor: 0.785 },
  profile: { hang: 0.498, floor: 0.498 },
  screen: { hang: 0, floor: 0 },
};
