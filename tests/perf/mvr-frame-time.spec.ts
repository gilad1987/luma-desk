import { loadavg } from 'node:os';
import { expect, test } from '@playwright/test';
import { bootApp, mvrFile, pickMvrFile } from '../shared/e2e';
import { measureFrames, scaledStageMvr } from '../shared';

// Frame time on the real GPU at 2560x1440 with every fixture at full (playwright.perf.config.ts).
const LIMIT = { medianMs: 12, p95Ms: 16 } as const;
const FRAMES = 120;
// Above this 1-minute load average other processes share the CPU and GPU, so the numbers are recorded but not judged.
const MAX_LOAD = 8;
// The triangles of the 40-fixture render stage at full in a frame with its buffer draw, as measured on 2026-11-18
// (a rest frame now draws 75,875, see tests/e2e/mvr-render-stats.spec.ts). A bigger rig that draws fewer is not lit
// or not drawn, and its frame time would prove nothing.
const TRIANGLES_OF_40 = 143_917;

for (const { n, gate } of [
  { n: 250, gate: true },
  { n: 500, gate: false },
]) {
  test(`frame time: synthetic stage with ${n} fixtures at full`, async ({ page }, testInfo) => {
    const desk = await bootApp(page);
    await pickMvrFile(page, desk, mvrFile(`Scaled${n}.mvr`, scaledStageMvr(n)));
    expect((await desk.evaluate((d) => d.mvrStage())).fixtureCount).toBe(n);
    await desk.evaluate((d, last) => d.run(`Fixture 101 Thru ${last} At 100`), 100 + n);
    // every fixture must be at full in the output, as the stats spec checks for the 40
    const out = await desk.evaluate((d) => d.outputAt(11));
    expect(out.filter((o) => o['dim'] === 100)).toHaveLength(n);
    // a warm-up, so shader compiles and first uploads are not in the measured frames
    await measureFrames(desk, 30);
    const measure = await measureFrames(desk, FRAMES);
    const load = loadavg()[0] ?? 0;
    const valid = load <= MAX_LOAD;
    const record = { n, load, valid, ...measure };
    await testInfo.attach(`frame-time-${n}.json`, { body: JSON.stringify(record, null, 2) });
    expect(measure.frames).toBe(FRAMES);
    expect(measure.triangles, 'triangles of a rig bigger than the 40 of the stats spec').toBeGreaterThanOrEqual(
      TRIANGLES_OF_40,
    );
    // 500 is recorded only; under load the numbers are not valid for the limit (the attachment says so)
    if (!gate || !valid) return;
    expect.soft(measure.medianMs, 'median frame time').toBeLessThanOrEqual(LIMIT.medianMs);
    expect.soft(measure.p95Ms, 'p95 frame time').toBeLessThanOrEqual(LIMIT.p95Ms);
  });
}
