import { expect, test, type Page } from '@playwright/test';
import { awaitMvrChain, bootApp, mvrFile, pickMvrFile, stepFrames } from '../shared/e2e';
import { gateImage, renderStageMvr } from '../shared';

// The perceptual render gate. It replaced the two bit-exact MVR shots, which flipped 1 to 2 pixels between runs on
// one commit (a depth tie on a tower): the metric forgives last-bit differences, so the gate runs in CI, while a lost
// object, a moved light or an exposure change still fails. Limits and how to record baselines: docs/render-gates.md.
// SwiftShader draws a frame in about a second when the machine is idle and far slower under load; every wait here is on
// a state (mvrReady, the post chain, frozen-clock frames), so only the time budget grows, never a result.
test.describe.configure({ timeout: 360_000 });
// the 3D view between the overlays of the desk layout: labels and the console stay out
const STAGE_CLIP = { x: 300, y: 40, width: 660, height: 420 };
const SHOTS = [
  { name: 'mvr-stage-foh', layout: 'desk', view: 'foh' },
  { name: 'mvr-stage-wide', layout: 'desk', view: 'wide' },
  { name: 'mvr-stage-front', layout: 'desk', view: 'front' },
  // the MA layout frames the stage in the part of the view its console leaves free, so its FOH is its own picture
  { name: 'mvr-stage-ma-foh', layout: 'ma', view: 'foh' },
] as const;
type Shot = (typeof SHOTS)[number];

/** Boots the desk, imports the synthetic stage with its first look on, runs `before`, and shoots `shot`. */
async function stageShot(page: Page, shot: Shot, before?: () => Promise<void>): Promise<Uint8Array> {
  const desk = await bootApp(page, { layout: shot.layout });
  await pickMvrFile(page, desk, mvrFile('RenderStage.mvr', renderStageMvr()));
  await page.locator('#mvrSummaryClose').click();
  expect((await desk.evaluate((d) => d.state())).execs[0]?.name).toBe('MVR First Look');
  // the post chain starts to load on the first frame of the MVR stage, at a wall-clock moment; the shot waits for
  // it, so every frame of the fade goes through the MVR chain in every run
  await desk.evaluate((d) => d.mvrReady());
  await awaitMvrChain(desk);
  await before?.();
  await page.evaluate((v) => window.__desk.setView(v, true), shot.view);
  // the first look fades in; 2 s of frozen-clock frames ends the fade
  await stepFrames(desk, 500, 4);
  if (shot.layout === 'desk') return new Uint8Array(await page.screenshot({ clip: STAGE_CLIP }));
  // the height of the free part of the 3D view (the same in every run, as the window size is fixed), and the same
  // columns as the desk clip: the labels in its corners stay out, the stage it frames is in
  const free = await desk.evaluate((d) => d.viewFit().free);
  const y = Math.ceil(free.y);
  const clip = { x: STAGE_CLIP.x, y, width: STAGE_CLIP.width, height: Math.floor(free.y + free.height) - y };
  return new Uint8Array(await page.screenshot({ clip }));
}

for (const shot of SHOTS) {
  test(`image gate: synthetic MVR stage / ${shot.layout} ${shot.view}`, async ({ page }, testInfo) => {
    const { failures } = await gateImage(shot.name, await stageShot(page, shot), testInfo);
    expect(failures).toEqual([]);
  });
}

// Proves on every run that the gate can fail: the operator's HOUSE slider, moved 30 points, must break a limit.
test('image gate: HOUSE moved 30 points through the UI fails the FOH baseline', async ({ page }, testInfo) => {
  const house = page.locator('#house');
  const shot = await stageShot(page, SHOTS[0], async () => {
    const now = Number(await house.inputValue());
    await house.fill(String(now >= 50 ? now - 30 : now + 30));
  });
  const { failures } = await gateImage(SHOTS[0].name, shot, testInfo, false);
  expect(failures.length).toBeGreaterThan(0);
});
