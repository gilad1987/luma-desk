import { halton } from './halton';

/** The reconstruction filter: a Gaussian with this standard deviation, in output pixels. */
export const FILTER_SIGMA_PX = 0.5;
/** The filter is cut at 3 sigma, so no sample lands more than 1.5 px from its pixel centre. */
export const FILTER_CUTOFF_SIGMAS = 3;
const TAIL = Math.exp(-(FILTER_CUTOFF_SIGMAS * FILTER_CUTOFF_SIGMAS) / 2);

/**
 * The sub-pixel camera offset of sample `sample`, in output pixels (x right, y down, as `setViewOffset` reads them).
 *
 * Filter weights: the offsets are drawn FROM the Gaussian filter (importance sampling: the inverse CDF of the 2D
 * Gaussian radius, cut at 3 sigma, on Halton(2,3) points), so every sample has weight 1 and the resolve is a plain
 * mean: sum / count. Weighting box-jittered samples instead would need a per-pixel weight sum next to the colour sum.
 * Sample 0 reads Halton index 1, because index 0 is (0, 0) in every base.
 */
export function gaussianJitter(sample: number, sigma = FILTER_SIGMA_PX): [number, number] {
  const u = halton(sample + 1, 2);
  const v = halton(sample + 1, 3);
  // the truncated Rayleigh radius: u = 0 gives 0, u -> 1 gives the cutoff
  const radius = sigma * Math.sqrt(-2 * Math.log(1 - u * (1 - TAIL)));
  const angle = 2 * Math.PI * v;
  return [radius * Math.cos(angle), radius * Math.sin(angle)];
}
