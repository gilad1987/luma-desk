import { statSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test, type JSHandle, type Page } from '@playwright/test';
import type { DeskTestApi } from '../shared';
import {
  SAMPLES_DIR,
  awaitMvrChain,
  bootApp,
  collectErrors,
  mvrFile,
  pickMvrFile,
  readSample,
  sampleFiles,
} from '../shared/e2e';

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

/**
 * Imports one sample through the Show File dialog, closes its summary and waits for the MVR post chain, whose render
 * targets count as textures: a count read before the chain's chunk has loaded is lower than every later one.
 */
async function importSample(page: Page, desk: JSHandle<DeskTestApi>, name: string): Promise<void> {
  await pickMvrFile(page, desk, mvrFile(name, readSample(name)));
  await page.locator('#mvrSummaryClose').click();
  await awaitMvrChain(desk);
}

/**
 * The renderer's GPU counts after three frames, so every mesh of the current stage has been uploaded. The MVR post
 * chain starts to load on the first MVR frame and can arrive later, so one frame starts the load and `mvrReady` waits
 * for it before the three frames; else the first reading of an import misses the chain's targets.
 */
async function renderMemory(
  page: Page,
  desk: JSHandle<DeskTestApi>,
): Promise<{ geometries: number; textures: number }> {
  await desk.evaluate(async (d) => {
    await d.frames(1);
    await d.mvrReady();
    await d.frames(3);
  });
  return page.evaluate(() => window.__desk.renderMemory());
}

/**
 * Applies the festival template with the rig blacked out (the B.O. button). The show that plays is not the same in
 * the two readings: the demo show before an import, the MVR first look after it, which stays on the executor and uses
 * a gobo the demo's first cue does not (one more texture, and not a leak). Dark fixtures draw no beam, pool or
 * glow, so both readings count the stage alone, which is what an import must leave as it was.
 */
async function darkFestival(page: Page, desk: JSHandle<DeskTestApi>): Promise<void> {
  await page.evaluate(() => window.__desk.applyTemplate('festival'));
  if (!(await desk.evaluate((d) => d.state().blackout))) await page.locator('#boBtn').click();
  expect(await desk.evaluate((d) => d.state().blackout)).toBe(true);
}

test('a template after an MVR import holds the GPU memory of the same template without it', async ({ page }) => {
  const errors = collectErrors(page);
  const desk = await bootApp(page);
  await darkFestival(page, desk);
  const fresh = await renderMemory(page, desk);
  await page.evaluate(() => window.__desk.applyTemplate('built-in'));

  await importSample(page, desk, smallestSample());
  await darkFestival(page, desk);
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
