import { expect, test, type Page } from '@playwright/test';
import { bootApp, stepFrames } from '../shared';

const LAYOUTS = ['ma', 'desk', 'classic'] as const;
// FOH is the default operator view (MA uses its own FOH camera); Top and Side show the whole rig from two axes
const VIEWS = ['foh', 'top', 'side'] as const;
// every face index.html requests from Google Fonts; text drawn before a face arrives uses the fallback font
const WEB_FONTS = [
  ...[400, 500, 600, 700, 800].map((w) => `${w} 13px Inter`),
  ...[400, 600].map((w) => `${w} 13px "JetBrains Mono"`),
];

/**
 * The web fonts come over the network and arrive at a different moment on each run, so text anti-aliasing changed
 * between runs. Loading every face first makes each screenshot use the same fonts as the baseline.
 */
async function waitForWebFonts(page: Page): Promise<void> {
  await page.evaluate(async (faces) => {
    await Promise.all(faces.map((face) => document.fonts.load(face)));
    await document.fonts.ready;
  }, WEB_FONTS);
}

for (const layout of LAYOUTS) {
  for (const view of VIEWS) {
    test(`screenshot ${layout} / ${view}`, async ({ page }) => {
      const desk = await bootApp(page, { layout });
      await waitForWebFonts(page);
      await page.evaluate((v) => window.__desk.setView(v, true), view);
      await stepFrames(desk, 500, 2);
      await expect(page).toHaveScreenshot(`${layout}-${view}.png`);
    });
  }
}
