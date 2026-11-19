/** Metres a beam must land below its lens to light a figure from above at all, and to count in full. */
const MIN_DROP = 1.5;
const FULL_DROP = 3;
/** The share of its height over the floor a beam must come down to count at all, and in full. */
const MIN_FALL = 0.35;
const FULL_FALL = 0.6;

const ramp = (value: number, from: number, to: number): number =>
  Math.min(Math.max((value - from) / (to - from), 0), 1);

/**
 * How much a beam row is a key light: its light on the surface it lands on, more for a light from the front (the
 * audience is at +z), as that is the light whose shadows the audience sees. A beam that ends in the air lights no
 * figure, and a field wider than 100 degrees has no shadow worth a map.
 *
 * A key light stands above its figures and lands near the floor they stand on. A beam that lands less than a
 * figure's height below its lens ends on the truss it hangs from or on a riser next to it, and a beam that crosses
 * the stage to the truss on the other side comes down a small share of its height. Both are very bright where they
 * land, because that is near and the beam is narrow: without these terms such beams took every map of a rig, and
 * the front light of the band had none.
 *
 * `floor` is the world height of the floor the figures stand on: a stage on a platform is not at world y 0, and
 * measured from there its keys come down a small share of their height (see `KeyOffers` for where it comes from).
 */
export function keyScore(row: Float32Array, floor = 0): number {
  if ((row[15] ?? 1) > 0.5 || (row[7] ?? 0) > 1.2) return 0;
  const length = row[3] ?? 0;
  const reach = Math.max(length, 1);
  const drop = -(row[5] ?? 0) * length;
  const fall = drop / Math.max((row[1] ?? 0) - floor, drop, 1e-3);
  const above = ramp(drop, MIN_DROP, FULL_DROP) * ramp(fall, MIN_FALL, FULL_FALL);
  const peak = Math.max(row[8] ?? 0, row[9] ?? 0, row[10] ?? 0);
  return (peak / (reach * reach)) * (0.4 + Math.max(-(row[6] ?? 0), 0)) * above;
}
