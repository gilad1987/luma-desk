import { expect, test } from '@playwright/test';
import { bootApp, collectErrors, mvrFile, pickMvrFile } from '../shared/e2e';
import { measureFrames, RENDER_RIG_FIXTURES, renderStageMvr } from '../shared';

const FRAMES = 60;

// A measurement, not a gate yet: later render units compare against the attached numbers, so the bounds are loose.
test('the synthetic MVR stage at full: draw calls, triangles and frame time', async ({ page }, testInfo) => {
  const errors = collectErrors(page);
  const desk = await bootApp(page);
  await pickMvrFile(page, desk, mvrFile('RenderStage.mvr', renderStageMvr()));
  expect((await desk.evaluate((d) => d.mvrStage())).fixtureCount).toBe(RENDER_RIG_FIXTURES);
  // through the command line, as an operator would put every fixture at full
  await desk.evaluate((d) => d.run('Fixture 101 Thru 140 At 100'));
  const out = await desk.evaluate((d) => d.outputAt(11));
  expect(out.filter((o) => o['dim'] === 100)).toHaveLength(RENDER_RIG_FIXTURES);
  const measure = await measureFrames(desk, FRAMES);
  await testInfo.attach('render-stats.json', {
    body: JSON.stringify(measure, null, 2),
    contentType: 'application/json',
  });
  expect(measure.frames).toBe(FRAMES);
  expect(measure.calls).toBeGreaterThan(0);
  expect(measure.triangles).toBeGreaterThan(0);
  expect(measure.medianMs).toBeGreaterThan(0);
  expect(errors).toEqual([]);
});
