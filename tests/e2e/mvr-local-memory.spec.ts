import { statSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test, type JSHandle, type Page } from '@playwright/test';
import type { DeskTestApi } from '../shared';
import { SAMPLES_DIR, bootApp, collectErrors, mvrFile, pickMvrFile, readSample, sampleFiles } from '../shared/e2e';

/*
 * Local only: the official gdtf.eu samples are third-party files and never committed, so this spec reads them from
 * MVR_SAMPLES_DIR. Synthetic files have no scenery meshes, so only a real sample shows a scenery left in GPU memory.
 */
test.describe.configure({ mode: 'default', timeout: 300_000 });

test.beforeEach(() => {
  test.info().skip(SAMPLES_DIR === undefined, 'set MVR_SAMPLES_DIR to run the official MVR samples');
});

/** The smallest sample file, so the spec stays quick whatever the folder holds. */
function smallestSample(): string {
  const size = (name: string): number => statSync(join(SAMPLES_DIR ?? '', name)).size;
  const [smallest] = sampleFiles().sort((a, b) => size(a) - size(b));
  if (smallest === undefined) throw new Error(`no .mvr file in ${SAMPLES_DIR ?? ''}`);
  return smallest;
}

/** Imports one sample through the Show File dialog and closes its summary. */
async function importSample(page: Page, desk: JSHandle<DeskTestApi>, name: string): Promise<void> {
  await pickMvrFile(page, desk, mvrFile(name, readSample(name)));
  await page.locator('#mvrSummaryClose').click();
}

/** The renderer's GPU counts after three frames, so every mesh of the current stage has been uploaded. */
async function renderMemory(
  page: Page,
  desk: JSHandle<DeskTestApi>,
): Promise<{ geometries: number; textures: number }> {
  await desk.evaluate((d) => d.frames(3));
  return page.evaluate(() => window.__desk.renderMemory());
}

test('a template after an MVR import holds the GPU memory of the same template without it', async ({ page }) => {
  const errors = collectErrors(page);
  const desk = await bootApp(page);
  await page.evaluate(() => window.__desk.applyTemplate('festival'));
  const fresh = await renderMemory(page, desk);
  await page.evaluate(() => window.__desk.applyTemplate('built-in'));

  await importSample(page, desk, smallestSample());
  await page.evaluate(() => window.__desk.applyTemplate('festival'));
  await desk.evaluate((d) => d.mvrReady());
  expect(await renderMemory(page, desk)).toEqual(fresh);
  expect(await desk.evaluate((d) => d.mvrScenery())).toBe(false);
  expect(errors).toEqual([]);
});

test('the same sample imported five times holds the GPU memory of one import', async ({ page }) => {
  const errors = collectErrors(page);
  const desk = await bootApp(page);
  const name = smallestSample();
  await importSample(page, desk, name);
  const once = await renderMemory(page, desk);
  for (let i = 0; i < 4; i += 1) await importSample(page, desk, name);
  expect(await renderMemory(page, desk)).toEqual(once);
  expect(errors).toEqual([]);
});
