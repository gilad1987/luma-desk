import { expect, test, type JSHandle, type Page } from '@playwright/test';
import type { DeskTestApi } from '../shared';
import { SYNTHETIC_MVR, bootApp, collectErrors, pickMvrFile, readMvrStage } from '../shared/e2e';

/**
 * The MVR scenery and the missing-file prompt follow a stage change that Stage Builder code makes, not only Load demo
 * rig: a template applied as the builder applies it, and a pasted show without a stage. The 3D view says nothing a
 * spec can read, so `mvrScenery()` reports whether the scenery holds the layers of a file.
 */

/** Boots, imports the synthetic MVR and checks that its scenery is drawn, so a later `false` is a real change. */
async function bootWithImport(page: Page): Promise<JSHandle<DeskTestApi>> {
  const desk = await bootApp(page);
  await pickMvrFile(page, desk, SYNTHETIC_MVR);
  expect(await desk.evaluate((d) => d.mvrScenery())).toBe(true);
  return desk;
}

test('a template applied after an MVR import drops the MVR scenery', async ({ page }) => {
  const errors = collectErrors(page);
  const desk = await bootWithImport(page);
  await page.evaluate(() => window.__desk.applyTemplate('theatre'));
  await desk.evaluate((d) => d.mvrReady());
  expect((await readMvrStage(desk)).kind).toBe('template');
  expect(await desk.evaluate((d) => d.mvrScenery())).toBe(false);
  await expect(page.locator('#mvrMissingPrompt')).toBeHidden();
  expect(errors).toEqual([]);
});

test('a pasted show without a stage after an MVR import drops the MVR scenery', async ({ page }) => {
  const errors = collectErrors(page);
  const desk = await bootWithImport(page);
  // the summary holds the modal; closing it closes the dialog, so the Show File button opens it again
  await page.locator('#mvrSummaryClose').click();
  await page.locator('#fileBtn').click();
  await page.locator('#fTxt').fill('{}');
  await page.locator('#fImp').click();
  await desk.evaluate((d) => d.mvrReady());
  expect((await readMvrStage(desk)).kind).not.toBe('mvr');
  expect(await desk.evaluate((d) => d.mvrScenery())).toBe(false);
  await expect(page.locator('#mvrMissingPrompt')).toBeHidden();
  expect(errors).toEqual([]);
});
