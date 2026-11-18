import type { JSHandle } from '@playwright/test';
import type { DeskTestApi } from '../deskApi';

/** `__desk.test.renderStats()`: the last drawn frame's renderer counts over all its passes, and GPU memory. */
export interface RenderStats {
  calls: number;
  triangles: number;
  points: number;
  lines: number;
  programs: number;
  geometries: number;
  textures: number;
}

/** The measurement half of the test API (src/app/testHook/frameStats.ts); only the render specs read it. */
interface FrameStatsApi {
  renderStats(): RenderStats;
  frameTimes(n: number): number[];
}

/** What a render spec records for one scene; frame times are real ms around the frame loop's callback. */
export interface RenderMeasure extends RenderStats {
  frames: number;
  medianMs: number;
  p95Ms: number;
}

/** The value at fraction `q` of the sorted list (nearest rank), or 0 for an empty list. */
export function quantile(values: readonly number[], q: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))] ?? 0;
}

/**
 * Draws `frames` frames 16 ms apart on the frozen clock and returns the last frame's counts and the frame times. The
 * shared `DeskTestApi` type leaves the two measurement methods out, so this one place widens it.
 */
export async function measureFrames(desk: JSHandle<DeskTestApi>, frames: number): Promise<RenderMeasure> {
  const { stats, times } = await desk.evaluate(async (d, n) => {
    const api = d as DeskTestApi & FrameStatsApi;
    for (let i = 0; i < n; i++) {
      d.advance(16);
      await d.frames(1);
    }
    return { stats: api.renderStats(), times: api.frameTimes(n) };
  }, frames);
  return { ...stats, frames: times.length, medianMs: quantile(times, 0.5), p95Ms: quantile(times, 0.95) };
}
