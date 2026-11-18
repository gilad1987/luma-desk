import { expect, test, type JSHandle, type Page } from '@playwright/test';
import type { DeskTestApi, SavedShow } from '../shared';
import { SYNTHETIC_MVR, bootApp, clickInShowFile, collectErrors, pickMvrFile, readMvrStage } from '../shared/e2e';

// The MVR scenery and the missing-file prompt follow every stage change (`followStage`), not only an MVR import.

/** The part of a show's stage these specs change: the source names the MVR file by hash. */
interface ShowWithStage extends SavedShow {
  stage: { source: { kind: string; name: string; fileHash?: string } };
}

/** A SHA-256 that no stored file has, so the restore of a show that names it finds no bytes. */
const UNKNOWN_HASH = 'f'.repeat(64);

/** Boots, imports the synthetic MVR, closes the summary and returns the desk and the show that names the file. */
async function importedShow(page: Page): Promise<{ desk: JSHandle<DeskTestApi>; show: ShowWithStage }> {
  const desk = await bootApp(page);
  await pickMvrFile(page, desk, SYNTHETIC_MVR);
  await page.locator('#mvrSummaryClose').click();
  const show = (await desk.evaluate((d) => d.serialize())) as ShowWithStage;
  expect(show.stage.source.fileHash).toBeDefined();
  return { desk, show };
}

/** Loads `show` through the Show File dialog's text import and waits for the MVR load it queues. */
async function pasteShow(page: Page, desk: JSHandle<DeskTestApi>, show: ShowWithStage): Promise<void> {
  await page.locator('#fileBtn').click();
  await page.locator('#fTxt').fill(JSON.stringify(show));
  await page.locator('#fImp').click();
  await desk.evaluate((d) => d.mvrReady());
}

/** `show` with its stage source changed, other stage data kept. */
const withSource = (show: ShowWithStage, source: Partial<ShowWithStage['stage']['source']>): ShowWithStage => ({
  ...show,
  stage: { ...show.stage, source: { ...show.stage.source, ...source } },
});

const hasScenery = (desk: JSHandle<DeskTestApi>): Promise<boolean> => desk.evaluate((d) => d.mvrScenery());

test('a template hides the missing-file prompt of a pasted MVR show', async ({ page }) => {
  const errors = collectErrors(page);
  const { desk, show } = await importedShow(page);
  await pasteShow(page, desk, withSource(show, { name: 'Gone.mvr', fileHash: UNKNOWN_HASH }));
  await expect(page.locator('#mvrMissingPrompt')).toContainText('Gone.mvr');
  expect(await hasScenery(desk)).toBe(false);

  await page.evaluate(() => window.__desk.applyTemplate('festival'));
  await desk.evaluate((d) => d.mvrReady());
  await expect(page.locator('#mvrMissingPrompt')).toBeHidden();
  expect(errors).toEqual([]);
});

test('a pasted show of an MVR file draws its scenery again after Load demo rig', async ({ page }) => {
  const errors = collectErrors(page);
  const { desk, show } = await importedShow(page);
  await clickInShowFile(page, 'fDemoRig');
  await desk.evaluate((d) => d.mvrReady());
  expect(await hasScenery(desk)).toBe(false);

  await pasteShow(page, desk, show);
  expect(await readMvrStage(desk)).toMatchObject({ kind: 'mvr', fixtureCount: 2 });
  expect(await hasScenery(desk)).toBe(true);
  await expect(page.locator('#mvrMissingPrompt')).toBeHidden();
  expect(errors).toEqual([]);
});

test('a builder stage that keeps the MVR file hash draws its scenery after a reload', async ({ page }) => {
  const errors = collectErrors(page);
  const { show } = await importedShow(page);
  // the bytes stay in this page's IndexedDB; a new boot with a saved builder stage of the same file restores them
  const desk = await bootApp(page, { show: withSource(show, { kind: 'builder', name: 'Edited' }) });
  await desk.evaluate((d) => d.mvrReady());
  expect(await readMvrStage(desk)).toMatchObject({ kind: 'builder', fixtureCount: 2 });
  expect(await hasScenery(desk)).toBe(true);
  await expect(page.locator('#mvrMissingPrompt')).toBeHidden();
  expect(errors).toEqual([]);
});

test('an import from the missing-file prompt while the builder is open cancels the builder', async ({ page }) => {
  const errors = collectErrors(page);
  const { desk, show } = await importedShow(page);
  await pasteShow(page, desk, withSource(show, { name: 'Gone.mvr', fileHash: UNKNOWN_HASH }));
  await page.locator('#buildBtn').click();
  await page.locator('[data-template="theatre"]').click();
  await page.locator('[data-venue="sultans-pool"]').click();
  await expect(page.locator('section.builder.is-editing')).toBeVisible();

  await page.locator('#mvrMissingFile').setInputFiles(SYNTHETIC_MVR);
  await desk.evaluate((d) => d.mvrReady());
  await expect(page.locator('section.builder')).toHaveCount(0);
  expect(await readMvrStage(desk)).toMatchObject({ kind: 'mvr', fixtureCount: 2 });
  expect(await hasScenery(desk)).toBe(true);
  await expect(page.locator('#mvrMissingPrompt')).toBeHidden();
  // the cancel gives the desk back: no area stays inert under a closed builder
  await expect(page.locator('#side, #enc, #desk').and(page.locator('[inert]'))).toHaveCount(0);
  expect(errors).toEqual([]);
});
