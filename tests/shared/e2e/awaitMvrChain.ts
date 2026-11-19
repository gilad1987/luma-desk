import { expect, type JSHandle } from '@playwright/test';
import type { DeskTestApi } from '../deskApi';

/**
 * Draws one frame, then waits until the lazy MVR post chain is ready to draw. The chain's chunk loads on the first
 * frame of an MVR stage and takes real time, so a picture taken a fixed count of frames after an import is drawn by
 * the built-in chain in one run and by the MVR chain in the next. The wait draws no further frame and does not move
 * the test clock: some render state steps per drawn frame, so the count of frames before a picture must be the same
 * in every run.
 */
export async function awaitMvrChain(desk: JSHandle<DeskTestApi>): Promise<void> {
  await desk.evaluate((d) => d.frames(1));
  await expect.poll(() => desk.evaluate((d) => d.mvrPostChain()), { timeout: 30_000 }).toBe(true);
}
