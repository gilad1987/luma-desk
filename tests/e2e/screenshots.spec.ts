import { expect, test } from '@playwright/test';
import { bootApp, stepFrames } from '../shared';

const LAYOUTS = ['ma', 'desk', 'classic'] as const;
// FOH is the default operator view (MA uses its own FOH camera); Top and Side show the whole rig from two axes
const VIEWS = ['foh', 'top', 'side'] as const;

for (const layout of LAYOUTS) {
  for (const view of VIEWS) {
    test(`screenshot ${layout} / ${view}`, async ({ page }) => {
      const desk = await bootApp(page, { layout });
      await page.evaluate((v) => window.__desk.setView(v, true), view);
      await stepFrames(desk, 500, 2);
      await expect(page).toHaveScreenshot(`${layout}-${view}.png`);
    });
  }
}
