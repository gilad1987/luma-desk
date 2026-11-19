/**
 * Both focus pads draw the current stage map: after a stage change (here a template with another deck and no LED
 * wall, through the test hook) the MA touch-screen pad `#tsPos` and the Position pad of the encoder panel show new
 * pixels. They draw only when built, on an aim and on a selection change, so without the `rigChanged` redraw they kept
 * the old stage.
 */
import { expect, test, type Page } from '@playwright/test';
import { bootApp, collectErrors } from '../shared/e2e';

const MA_PAD = '#tsPos';
const ENCODER_PAD = '#encExtra canvas.pad';

/** The PNG data URL of each pad's pixels. */
function padPixels(page: Page): Promise<string[]> {
  return page.evaluate(
    (selectors) => selectors.map((s) => document.querySelector<HTMLCanvasElement>(s)?.toDataURL() ?? ''),
    [MA_PAD, ENCODER_PAD],
  );
}

test('a template with another deck redraws the MA focus pad and the encoder Position pad', async ({ page }) => {
  const errors = collectErrors(page);
  await bootApp(page, { layout: 'desk' });
  await page.locator('#featTabs button', { hasText: 'Position' }).click();
  await expect(page.locator(ENCODER_PAD)).toBeVisible();
  const before = await padPixels(page);
  expect(before.every((url) => url.startsWith('data:image/png'))).toBe(true);

  await page.evaluate(() => window.__desk.applyTemplate('theatre'));
  const after = await padPixels(page);
  expect([after[0] === before[0], after[1] === before[1]]).toEqual([false, false]);
  expect(errors).toEqual([]);
});
