import { expect, test, type JSHandle, type Page } from '@playwright/test';
import type { StillHarness } from '../../src/render/still/testing/stillHarness';
import type { DeskTestApi } from '../shared';
import { bootApp } from '../shared/e2e';

// The still renderer's core over the page's own WebGL renderer, with the analytic fake source (no MVR passes yet).
test.describe.configure({ timeout: 300_000 });

/** Boots the app with ?test and opens the still harness; returns the harness and the desk's test API. */
async function harness(page: Page): Promise<JSHandle<StillHarness>> {
  return (await open(page)).still;
}

async function open(page: Page): Promise<{ desk: JSHandle<DeskTestApi>; still: JSHandle<StillHarness> }> {
  const desk = await bootApp(page);
  const still = await page.evaluateHandle(() => {
    const start: unknown = Reflect.get(window, '__deskStill');
    if (typeof start !== 'function') throw new Error('window.__deskStill is missing');
    return (start as () => Promise<StillHarness>)();
  });
  return { desk, still };
}

/** Keeps measured numbers with the test's report (the HTML report and the trace) instead of the console. */
const attachJson = (name: string, data: unknown): Promise<void> =>
  test.info().attach(name, { body: JSON.stringify(data, null, 2), contentType: 'application/json' });

/** The mean absolute error of a mean of n uniform samples of width 0.4 (in 8-bit steps): sqrt(2/pi) * std / sqrt(n). */
const noiseError = (n: number): number => (Math.sqrt(2 / Math.PI) * ((0.4 * 255) / Math.sqrt(12))) / Math.sqrt(n);

test('64 samples converge to the analytic reference and leave the renderer as it was', async ({ page }) => {
  const still = await harness(page);
  const before = await still.evaluate((h) => h.snapshot());
  const draft = await still.evaluate((h) => h.converge('draft'));
  const final = await still.evaluate((h) => h.converge('final'));
  const numbers = { format: final.format, errors: { draft: draft.errors, final: final.errors } };
  const checkerMean = { draft: draft.checkerMean, final: final.checkerMean };
  await attachJson('still errors (8-bit steps) and checker means', { ...numbers, checkerMean });
  const [ramp, checker, noise] = final.errors;
  // the ramp keeps its value under a symmetric filter: only the 8-bit rounding is left (mean 0.25)
  expect(ramp).toBeLessThan(0.5);
  // the accumulated checker equals the mean over the very jitter points the render used, to the rounding
  expect(checker).toBeLessThan(0.75);
  // the noise falls as 1/sqrt(n): 2.93 steps expected at 64 samples, 5.87 at 16
  expect(Math.abs((noise ?? 0) / noiseError(64) - 1)).toBeLessThan(0.15);
  expect(Math.abs((draft.errors[2] ?? 0) / noiseError(16) - 1)).toBeLessThan(0.15);
  expect(await still.evaluate((h) => h.snapshot())).toEqual(before);
});

test('an 8K tile plan reassembles with no seam', async ({ page }) => {
  const still = await harness(page);
  const seam = await still.evaluate((h) => h.seam());
  expect(seam).toEqual({ maxDiff: 0, tiledParts: 1, compared: 960 * 540 });
});

test('cancel ends the render within 100 ms and frees the source', async ({ page }) => {
  const { desk, still } = await open(page);
  const before = await still.evaluate((h) => h.snapshot());
  await still.evaluate((h) => h.begin());
  // ?test drives the animation frames from the spec: two frames prepare the render and start its samples
  await desk.evaluate((d) => d.frames(2));
  const cancel = await still.evaluate((h) => h.cancel());
  expect([cancel.state, cancel.reason]).toEqual(['cancelled', 'seen rendering']);
  expect(cancel.ms).toBeLessThan(100);
  expect(cancel.sourceDisposed).toBe(true);
  expect(await still.evaluate((h) => h.snapshot())).toEqual(before);
});

// A measurement, not a check: it attaches the numbers for a report and exists only when STILL_MEASURE=1 is set.
const measure = process.env['STILL_MEASURE'] ? test : null;
measure?.('measure the fake at 1080p, 4K and 8K', async ({ page }) => {
  const still = await harness(page);
  for (const size of [
    { w: 1920, h: 1080 },
    { w: 3840, h: 2160 },
    { w: 7680, h: 4320 },
  ]) {
    const numbers = await still.evaluate((s, { w, h }) => s.measure(w, h), size);
    await attachJson(`still ${size.w}x${size.h}`, numbers);
  }
});
