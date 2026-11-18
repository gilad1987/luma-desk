import type { JSHandle } from '@playwright/test';
import type { DeskTestApi } from '../shared';

/** The per-frame counts of the test API (src/app/testHook/frameStats.ts); the shared `DeskTestApi` leaves them out. */
interface FrameCounts {
  renderStats(): { calls: number; triangles: number };
}

/** The largest draw-call and triangle counts of a run of frames. */
export interface PeakCounts {
  calls: number;
  triangles: number;
}

/**
 * Starts a circle effect on `fixture`, then draws `frames` frames 16 ms apart on the frozen clock and returns the
 * largest calls and triangles of one frame. While something moves, the surface buffers are drawn again every second
 * frame at most (commit dc40b56b), so any run of 2 or more frames holds one frame with that extra scene draw, whatever
 * the phase of the cache.
 */
export async function movingPeak(desk: JSHandle<DeskTestApi>, fixture: number, frames: number): Promise<PeakCounts> {
  return desk.evaluate(
    async (d, { fixture, frames }) => {
      const api = d as DeskTestApi & FrameCounts;
      api.run(`Fixture ${fixture}`);
      api.applyFx('circle');
      const peak = { calls: 0, triangles: 0 };
      for (let i = 0; i < frames; i++) {
        d.advance(16);
        await d.frames(1);
        const s = api.renderStats();
        peak.calls = Math.max(peak.calls, s.calls);
        peak.triangles = Math.max(peak.triangles, s.triangles);
      }
      return peak;
    },
    { fixture, frames },
  );
}
