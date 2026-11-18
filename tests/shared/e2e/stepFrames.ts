import type { JSHandle } from '@playwright/test';
import type { DeskTestApi } from '../deskApi';

/**
 * Moves the frozen clock forward `ms`, then draws one frame, `n` times. Time and frames move together, as in the
 * real loop, so fades and phasers reach the same point on every run.
 */
export async function stepFrames(desk: JSHandle<DeskTestApi>, ms = 100, n = 1): Promise<void> {
  for (let i = 0; i < n; i++) {
    await desk.evaluate((d, ms) => {
      d.advance(ms);
      return d.frames(1);
    }, ms);
  }
}
