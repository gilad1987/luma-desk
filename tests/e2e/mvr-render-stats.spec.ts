import { expect, test } from '@playwright/test';
import { awaitMvrChain, bootApp, collectErrors, mvrFile, pickMvrFile } from '../shared/e2e';
import { measureFrames, RENDER_RIG_FIXTURES, renderStageMvr } from '../shared';
import { movingPeak } from './mvrMovingPeak';

// The time budget is the `render-stats` project's in playwright.config.ts: this spec draws far more frames than most.
const FRAMES = 60;
const WARM_UP_FRAMES = 40;
// a run of frames that always holds one surface-buffer draw while a fixture moves (every second frame at most)
const MOVING_FRAMES = 8;

/**
 * What the build drew for the synthetic stage at full, measured by this spec on 2026-11-19 on rq/render-quality: rest
 * at 867ab800 (5 runs); moving and objects as pinned before, at ee8faf54. At 867ab800 the objects were the same and
 * the moving peak drew 766 calls and 150,743 triangles, inside its band.
 * The counts do not depend on the GPU, so SwiftShader in CI gates them. Frame time is only attached here: SwiftShader
 * time says nothing of a GPU (the real-GPU gate is `test:perf`).
 *
 * Two states, because the surface light caches its buffers (dc40b56b): at rest a frame draws the scene once (since
 * ba4ee2c1 nothing on this stage moves at rest, so the settled frame no longer holds a buffer draw: 674 calls and
 * 143,917 triangles before, about half after); while a fixture moves, every second frame draws the scene a second
 * time for the buffers. The moving peak catches that frame whatever the cache phase, so a lost buffer draw fails.
 * The rest of 468 calls and 76,542 triangles before 867ab800 was a transient frame soon after the chain, not rest.
 */
const MEASURED = {
  rest: { calls: 385, triangles: 75_875 },
  moving: { calls: 765, triangles: 150_742 },
  objects: { programs: 43, geometries: 66, textures: 61 },
} as const;
const ceiling = (v: number): number => Math.ceil(v * 1.15);
/**
 * Floors at 0.85 x MEASURED: a change that stops drawing the bodies, the scenery or the buffers draws far fewer. The
 * beams are one instanced draw (a few calls, about 480 triangles), so a lost beam pass stays inside the band.
 */
const floor = (v: number): number => Math.floor(v * 0.85);

/** Soft-checks each count of `got` against the ceiling and, when `floored`, the floor of its measured value. */
function expectCounts<K extends string>(
  state: string,
  got: Readonly<Record<NoInfer<K>, number>>,
  want: Readonly<Record<K, number>>,
  floored: boolean,
) {
  for (const key of Object.keys(want) as K[]) {
    const value = want[key];
    expect.soft(got[key], `${state} ${key} over budget`).toBeLessThanOrEqual(ceiling(value));
    if (floored) expect.soft(got[key], `${state} ${key} under the floor`).toBeGreaterThanOrEqual(floor(value));
  }
}

test('the synthetic MVR stage at full stays within its draw-call, triangle and GPU-object budgets', async ({
  page,
}, testInfo) => {
  const errors = collectErrors(page);
  const desk = await bootApp(page);
  await pickMvrFile(page, desk, mvrFile('RenderStage.mvr', renderStageMvr()));
  expect((await desk.evaluate((d) => d.mvrStage())).fixtureCount).toBe(RENDER_RIG_FIXTURES);
  // through the command line, as an operator would put every fixture at full
  await desk.evaluate((d) => d.run('Fixture 101 Thru 140 At 100'));
  // the lit rows: every fixture at full, an exact count, which is stricter than a floor
  const out = await desk.evaluate((d) => d.outputAt(11));
  expect(out.filter((o) => o['dim'] === 100)).toHaveLength(RENDER_RIG_FIXTURES);
  // The frame on which the lazy MVR chain arrives depends on real time and sets the phase of the surface-buffer
  // redraws that follow, so the spec waits for the chain first. Those redraws come every second frame until about
  // frame 65 after the chain; the measured frame, the 100th (40 warm-up and 60 measured), is past them and between
  // two age redraws of the cache (MAX_AGE in SurfaceCache.ts, near frames 73 and 133), away from the shadow tiles
  // (TURN in KeyShadows.ts). A change to those constants can move a redraw onto it: a steady failure, not a flake.
  await awaitMvrChain(desk);
  await measureFrames(desk, WARM_UP_FRAMES);
  const measure = await measureFrames(desk, FRAMES);
  const moving = await movingPeak(desk, 101, MOVING_FRAMES);
  await testInfo.attach('render-stats.json', {
    body: JSON.stringify({ rest: measure, moving }, null, 2),
    contentType: 'application/json',
  });
  expect(measure.frames).toBe(FRAMES);
  expectCounts('rest', measure, MEASURED.rest, true);
  expectCounts('moving', moving, MEASURED.moving, true);
  expectCounts('objects', measure, MEASURED.objects, false);
  expect(measure.medianMs).toBeGreaterThan(0);
  expect(errors).toEqual([]);
});
