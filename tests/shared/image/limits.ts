import type { PerceptualDiff } from './perceptualDiff';

/**
 * Pass limits of the perceptual image gate. tests/unit/gates/imageLimits.test.ts is their specification: it builds
 * each case from the committed baselines and from synthetic images and asserts pass or fail (docs/render-gates.md
 * has the table and the measured run-to-run noise). Raise or lower one only with a measured reason in the same commit.
 * - exposure: |ln(Yb/Ya)| of the mean linear luminance. 2 % measures at most 0.019, 5 % at least 0.048.
 * - hue: the chroma-weighted hue turn. 3° measures at most 2.98° (the synthetic stage); 10° at least 6.16° (the
 *   almost grey Front view, where the neutral chroma floor keeps a turn from showing in full).
 * - share: changed blocks (shift-tolerant distance above 0.05). 0.0003 lets 5 of the 17,325 blocks of a 660x420 shot
 *   change; the brightest 1 % of the pixels dimmed by 30 % changes 15 or more (the dark wide view, the closest case),
 *   a lost 240 px truss line 60.
 * - worst: one block; a whole-pixel move of a thin line measures about 0, a lost 2 px grey truss line 0.12 or more.
 * - mean: the mean block distance, a broad backstop (5 % exposure on the synthetic stage measures 0.0055).
 */
export const IMAGE_LIMITS = { exposure: 0.035, hue: 4, share: 0.0003, worst: 0.15, mean: 0.01 } as const;

export type GateNumbers = Pick<PerceptualDiff, 'mean' | 'share' | 'worst' | 'exposure' | 'hue'>;

/** The limits a diff breaks, as readable lines; an empty list passes. */
export function imageGateFailures(d: GateNumbers): string[] {
  const out: string[] = [];
  const check = (name: string, value: number, limit: number, digits: number): void => {
    if (value >= limit) out.push(`${name} ${value.toFixed(digits)} >= ${limit}`);
  };
  check('|exposure|', Math.abs(d.exposure), IMAGE_LIMITS.exposure, 4);
  check('|hue|', Math.abs(d.hue), IMAGE_LIMITS.hue, 2);
  check('share', d.share, IMAGE_LIMITS.share, 5);
  check('worst', d.worst, IMAGE_LIMITS.worst, 4);
  check('mean', d.mean, IMAGE_LIMITS.mean, 5);
  return out;
}
