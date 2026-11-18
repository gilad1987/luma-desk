import { expect, test } from '@playwright/test';
import { SYNTHETIC_MVR, bootApp, clickInShowFile, collectErrors, pickMvrFile, readMvrStage } from '../shared/e2e';

test('Load demo rig replaces an imported MVR stage with the boot stage', async ({ page }) => {
  const errors = collectErrors(page);
  const desk = await bootApp(page);
  const demo = await readMvrStage(desk);
  await pickMvrFile(page, desk, SYNTHETIC_MVR);
  await page.locator('#mvrSummaryClose').click();
  expect((await readMvrStage(desk)).kind).toBe('mvr');

  await clickInShowFile(page, 'fDemoRig');
  await expect.poll(() => readMvrStage(desk)).toEqual(demo);
  expect(await page.evaluate(() => window.__desk.fixtures.length)).toBe(demo.fixtureCount);
  expect(errors).toEqual([]);
});
