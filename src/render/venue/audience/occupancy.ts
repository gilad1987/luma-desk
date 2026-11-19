/** The fixed seed of the audience: the same file always gets the same people on the same seats. */
const AUDIENCE_SEED = 20261118;

/** What the import summary chooses for the audience: drawn or not, and the share of seats that are taken. */
export interface AudienceChoice {
  readonly shown: boolean;
  readonly occupancy: number;
}

/** A full hall has free seats too: 85 % is a sold show with the usual gaps. */
export const DEFAULT_AUDIENCE: AudienceChoice = { shown: true, occupancy: 0.85 };

/**
 * A fixed number in [0, 1) for item `index` and trait `salt`: an integer hash, not `Math.random`, as the desk's
 * seeded random stream is counted by the determinism tests and an audience must not shift it.
 */
export function chance(index: number, salt: number): number {
  let h = Math.imul(index + 1, 0x9e3779b1) ^ Math.imul(salt + AUDIENCE_SEED, 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d);
  h = Math.imul(h ^ (h >>> 12), 0x297a2d39);
  return ((h ^ (h >>> 15)) >>> 0) / 4294967296;
}

/** How many of `seats` seats on one layer are taken at `occupancy` (0 to 1). */
export const figureCount = (seats: number, occupancy: number): number =>
  Math.round(seats * Math.min(Math.max(occupancy, 0), 1));

/**
 * The seats of a layer in the order they fill. The first `figureCount` of them are taken, so a higher occupancy
 * adds people and never moves one.
 */
export function fillOrder(seats: number): Uint32Array {
  const order = Array.from({ length: seats }, (_, index) => index);
  return Uint32Array.from(order.sort((a, b) => chance(a, 0) - chance(b, 0) || a - b));
}
