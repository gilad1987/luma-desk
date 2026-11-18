import { expect, test, type Page } from '@playwright/test';
import { STORAGE_KEYS, TIMER_POLLING } from '../shared';
import { bootApp, collectErrors, waitForTestApi } from '../shared/e2e';

/** Waits for the delayed save (a real 500 ms timer) to store a show that has, or has not, a `stage` key. */
async function waitForStoredStage(page: Page, hasStage: boolean): Promise<void> {
  await page.waitForFunction(
    ({ key, hasStage }) => {
      const text = localStorage.getItem(key);
      return text !== null && 'stage' in (JSON.parse(text) as object) === hasStage;
    },
    { key: STORAGE_KEYS.show, hasStage },
    TIMER_POLLING,
  );
}

test('the default stage saves no stage key', async ({ page }) => {
  const desk = await bootApp(page);
  await waitForStoredStage(page, false);
  expect(await desk.evaluate((d) => 'stage' in d.serialize())).toBe(false);
  expect(await page.evaluate(() => window.__desk.stage().count)).toBe(405);
});

test('a custom stage survives a reload', async ({ page }) => {
  const errors = collectErrors(page);
  await bootApp(page);
  await page.evaluate(() => window.__desk.applyTemplate('theatre'));
  const before = await page.evaluate(() => window.__desk.stage());
  expect(before.count).toBe(30);
  await waitForStoredStage(page, true);

  await page.reload();
  const desk = await waitForTestApi(page);
  expect(await page.evaluate(() => window.__desk.stage())).toEqual(before);
  expect(await page.evaluate(() => window.__desk.fixtures.length)).toBe(30);
  // the output follows the saved stage: one row per fixture of the new rig
  expect(await desk.evaluate((d) => d.outputAt(1).length)).toBe(30);
  expect(errors).toEqual([]);
});
