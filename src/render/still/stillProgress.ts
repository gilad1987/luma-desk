import type { StillProgress, StillState } from './StillWork';

/** The counters the controller keeps, from which the progress is read. */
export interface StillCounters {
  readonly state: StillState;
  readonly tile: number;
  readonly sample: number;
  readonly tiles: number;
  readonly maxSamples: number;
  readonly samplesDone: number;
  readonly renderMs: number;
}

/** Sampling is most of the time; the post chain, read-back and encode share the last 5 %. */
const SAMPLING_SHARE = 0.95;

/**
 * The progress from the counters. The time left assumes every remaining tile takes all its samples, so an adaptive
 * render finishes early, never late.
 */
export function stillProgress(c: StillCounters): StillProgress {
  const total = c.tiles * c.maxSamples;
  const units = Math.min(total, c.tile * c.maxSamples + c.sample);
  const sampled = c.state === 'resolving' || c.state === 'encoding' ? 1 : units / total;
  const fraction = c.state === 'done' ? 1 : sampled * SAMPLING_SHARE + (c.state === 'encoding' ? 0.04 : 0);
  const etaMs = c.samplesDone === 0 ? null : (c.renderMs / c.samplesDone) * (total - units);
  return { state: c.state, fraction, tile: c.tile, tiles: c.tiles, sample: c.sample, etaMs };
}
