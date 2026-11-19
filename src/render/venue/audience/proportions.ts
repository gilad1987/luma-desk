/**
 * The seated body as shares of the standing height (stature). The values are the adult means of the anthropometric
 * tables in S. Pheasant and C. Haslegrave, "Bodyspace" (the table of British adults aged 19 to 65, men and women
 * averaged); ISO 7250-1 defines the same dimensions and NASA-STD-3000 lists them for its own population. They are
 * written from the author's knowledge of those tables, rounded to two or three digits, and were not copied from the
 * book: check them against the source before they are used for anything but the look of a figure.
 * - `sittingHeight`: the seat to the top of the head.
 * - `shoulderHeight`: the seat to the acromion, the bony point of the shoulder.
 * - `shoulderBreadth`: across both upper arms at the deltoid muscles (bideltoid).
 * - `hipBreadth`: across the hips of a seated person.
 * - `poplitealHeight`: the floor to the underside of the thigh behind the knee, which is the seat height that fits.
 * - `buttockKnee`: the back of the buttock to the front of the knee.
 */
export const SEATED = {
  sittingHeight: 0.52,
  shoulderHeight: 0.335,
  shoulderBreadth: 0.26,
  hipBreadth: 0.21,
  poplitealHeight: 0.25,
  buttockKnee: 0.34,
} as const;
