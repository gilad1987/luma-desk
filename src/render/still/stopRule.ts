/** The sample counts per tile of the three presets. */
export const STILL_PRESETS = { draft: 16, final: 64, max: 256 } as const;
export type StillPreset = keyof typeof STILL_PRESETS;

/** The adaptive rule's probe: the tone-mapped tile mean, box-filtered down to this size and read back as RGBA8. */
export const PROBE_WIDTH = 256;
export const PROBE_HEIGHT = 144;
/** The adaptive rule compares the probe every this many samples. */
export const PROBE_EVERY = 8;
/** Converged when the mean absolute change per RGB channel is under this many 8-bit steps. */
export const CONVERGED_STEPS = 0.5;

/** The mean absolute difference of the RGB bytes of two RGBA8 images of one size, in 8-bit steps (alpha ignored). */
export function meanAbsChange(a: Uint8Array, b: Uint8Array): number {
  if (a.length !== b.length || a.length % 4 !== 0) throw new RangeError('the probes differ in size');
  let sum = 0;
  for (let i = 0; i < a.length; i += 4) {
    for (let c = 0; c < 3; c++) sum += Math.abs((a[i + c] ?? 0) - (b[i + c] ?? 0));
  }
  return sum / ((a.length / 4) * 3);
}

/**
 * When a tile has enough samples. A preset stops at its count. Adaptive stops at the first probe whose change from
 * the probe 8 samples earlier is under half an 8-bit step (the change of the mean then cannot show in the PNG on
 * average), or at 256 samples. One rule serves one tile at a time: `reset` before the next tile.
 */
export class StopRule {
  readonly maxSamples: number;
  readonly adaptive: boolean;
  private previous: Uint8Array | null = null;

  constructor(mode: StillPreset | 'adaptive') {
    this.adaptive = mode === 'adaptive';
    this.maxSamples = mode === 'adaptive' ? STILL_PRESETS.max : STILL_PRESETS[mode];
  }

  /** True when the tile, after `samples` samples, needs a probe for the adaptive test. */
  wantsProbe(samples: number): boolean {
    return this.adaptive && samples % PROBE_EVERY === 0 && samples < this.maxSamples;
  }

  /** Takes the probe made after a `wantsProbe` sample; true when the tile has converged. */
  offer(probe: Uint8Array): boolean {
    const previous = this.previous;
    this.previous = probe.slice();
    return previous !== null && meanAbsChange(previous, probe) < CONVERGED_STEPS;
  }

  reset(): void {
    this.previous = null;
  }
}
