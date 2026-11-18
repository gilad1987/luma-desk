/**
 * The values of the ambient occlusion of an MVR stage: the shade that the hall light and the bounce do not reach,
 * where a foot meets the deck, a riser meets the floor or a truss meets its tower.
 */
export const AO = {
  /** The reach of an occluder in metres; its weight falls to nothing at this distance. */
  radius: 0.6,
  /**
   * 1 is the estimator as published (McGuire, Scalable Ambient Obscurance). At 1 the back of every seated figure,
   * with a seat a hand behind it, lost a quarter of its light on a real file; 0.8 keeps the contact shade and
   * leaves the bodies their colour.
   */
  strength: 0.8,
  /** Metres a sample must stand above the surface to count: it hides the steps of the depth on a flat face. */
  bias: 0.02,
  /** The largest reach on the screen in depth pixels, so a surface next to the camera does not cost a wide search. */
  maxPixels: 160,
  /** The darkest value: some hall light always gets into a corner. */
  floor: 0.25,
} as const;

/** The switch of the occlusion, for an A/B image. Off draws every pixel as open, at the cost of the pass itself. */
export const occlusion = { isEnabled: true };
