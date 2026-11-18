/**
 * The three orchestra riser rows on each side of the stage, front to back: their depth `z` and riser height `h`.
 * The risers and the seated players both read it, so the players always sit on their riser.
 */
export const ORCHESTRA_ROWS: readonly { readonly z: number; readonly h: number }[] = [
  { z: -6.8, h: 0.25 },
  { z: -9.1, h: 0.5 },
  { z: -11.4, h: 0.75 },
];
