import type { FixtureTypeId } from '../FixtureType';

/**
 * The largest dimension, in metres, of every desk model as it hangs at rest, already scaled by its `T.size`. An MVR
 * import that knows a product's real overall size draws the model at `real size / span` (`bodyScale`), so the two
 * agree on that one dimension. Measured from the built models: a unit test pins each value against the model's real
 * bounding box, so a model change cannot drift from it silently. The screen has no model, so it has no span.
 */
export const BODY_SPANS: Readonly<Record<FixtureTypeId, number>> = {
  spot: 1.346,
  beam: 0.94,
  wash: 1.063,
  par: 0.613,
  blinder: 0.935,
  strobe: 1.413,
  bar: 1.3,
  follow: 1.346,
  profile: 0.883,
  screen: 0,
};
