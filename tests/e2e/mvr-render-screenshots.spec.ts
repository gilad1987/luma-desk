import { expect, test } from '@playwright/test';
import { bootApp, mvrFile, pickMvrFile, stepFrames } from '../shared/e2e';
import { renderStageMvr } from '../shared';

// The render-quality units change these baselines on purpose; each such change records new ones with the reason.
const VIEWS = ['foh', 'wide'] as const;
// The 3D view between the overlays: text anti-aliasing flipped 2,618 pixels in 1 of 3 runs even after the font load,
// and these shots guard the render, not the UI, so the clip leaves out every label and the console.
const STAGE_CLIP = { x: 300, y: 40, width: 660, height: 420 };
// every face index.html requests from Google Fonts, loaded first so text anti-aliasing matches the baseline
const WEB_FONTS = [
  ...[400, 500, 600, 700, 800].map((w) => `${w} 13px Inter`),
  ...[400, 600].map((w) => `${w} 13px "JetBrains Mono"`),
];

for (const view of VIEWS) {
  // @screenshot: macOS-only baselines, so CI skips the tag, as for screenshots.spec.ts
  test(`screenshot synthetic MVR stage / ${view}`, { tag: '@screenshot' }, async ({ page }) => {
    const desk = await bootApp(page, { layout: 'desk' });
    await page.evaluate(async (faces) => {
      await Promise.all(faces.map((face) => document.fonts.load(face)));
      await document.fonts.ready;
    }, WEB_FONTS);
    // the import plays the first look on executor 1; the shot shows it after its fade
    await pickMvrFile(page, desk, mvrFile('RenderStage.mvr', renderStageMvr()));
    await page.locator('#mvrSummaryClose').click();
    expect((await desk.evaluate((d) => d.state())).execs[0]?.name).toBe('MVR First Look');
    await page.evaluate((v) => window.__desk.setView(v, true), view);
    await stepFrames(desk, 500, 4);
    await expect(page).toHaveScreenshot(`mvr-stage-${view}.png`, { clip: STAGE_CLIP });
  });
}
