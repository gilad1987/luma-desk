import { expect, test, type Page } from '@playwright/test';
import { STORAGE_KEYS, TIMER_POLLING } from '../shared';
import {
  SYNTHETIC_MVR,
  bootApp,
  clickInShowFile,
  collectErrors,
  pickMvrFile,
  readMvrStage,
  waitForTestApi,
} from '../shared/e2e';

/** The part of the stored show these specs read: the stage source kind and the MVR hidden layers. */
interface StoredStage {
  stage?: { source: { kind: string }; mvr?: { hiddenLayers?: string[] } };
}

/** What the saved show must hold: the stage source kind (`none` without a stage) and, when given, the hidden layers. */
interface SavedStage {
  readonly kind: string;
  readonly hiddenLayers?: readonly string[];
}

/**
 * Waits until the saved show matches `expected`. The show is saved 500 ms after a change on a real timer, so a
 * reload before that would test an older save. The predicate is synchronous on purpose.
 */
async function waitForSavedStage(page: Page, expected: SavedStage): Promise<void> {
  const savedIs = ({ key, want }: { key: string; want: SavedStage }): boolean => {
    const { stage } = JSON.parse(localStorage.getItem(key) ?? '{}') as StoredStage;
    const hidden = JSON.stringify(stage?.mvr?.hiddenLayers ?? []);
    const layersMatch = want.hiddenLayers === undefined || hidden === JSON.stringify(want.hiddenLayers);
    return (stage?.source.kind ?? 'none') === want.kind && layersMatch;
  };
  await page.waitForFunction(savedIs, { key: STORAGE_KEYS.show, want: expected }, TIMER_POLLING);
}

/** Reloads the page and waits for the boot restore of a saved MVR stage. */
async function reloadDesk(page: Page): Promise<void> {
  await page.reload();
  const desk = await waitForTestApi(page);
  await desk.evaluate((d) => d.mvrReady());
}

test('New Show keeps the imported MVR stage, also after a reload', async ({ page }) => {
  const errors = collectErrors(page);
  const desk = await bootApp(page);
  await pickMvrFile(page, desk, SYNTHETIC_MVR);
  const imported = await readMvrStage(desk);
  await page.locator('#mvrSummaryClose').click();

  await clickInShowFile(page, 'fNew');
  expect(await readMvrStage(desk)).toEqual(imported);
  await waitForSavedStage(page, { kind: 'mvr' });
  await reloadDesk(page);
  expect(await readMvrStage(await waitForTestApi(page))).toEqual(imported);
  await expect(page.locator('#mvrMissingPrompt')).toBeHidden();
  expect(errors).toEqual([]);
});

test('a layer hidden in the import summary stays hidden in the saved show after a reload', async ({ page }) => {
  const errors = collectErrors(page);
  const desk = await bootApp(page);
  await pickMvrFile(page, desk, SYNTHETIC_MVR);
  await page.locator('#mvrLayers input[type=checkbox]').uncheck();
  await waitForSavedStage(page, { kind: 'mvr', hiddenLayers: ['L1'] });

  await reloadDesk(page);
  // New Show saves the live design at once, so the save after it proves the restored stage still hides the layer
  await clickInShowFile(page, 'fNew');
  await waitForSavedStage(page, { kind: 'mvr', hiddenLayers: ['L1'] });
  expect(errors).toEqual([]);
});

test('Load demo rig after an import brings the built-in stage back after a reload too', async ({ page }) => {
  const errors = collectErrors(page);
  const desk = await bootApp(page);
  const demo = await readMvrStage(desk);
  await pickMvrFile(page, desk, SYNTHETIC_MVR);
  await waitForSavedStage(page, { kind: 'mvr' });
  await page.locator('#mvrSummaryClose').click();

  await clickInShowFile(page, 'fDemoRig');
  await desk.evaluate((d) => d.mvrReady());
  await waitForSavedStage(page, { kind: 'none' });
  await reloadDesk(page);
  expect(await readMvrStage(await waitForTestApi(page))).toEqual(demo);
  await expect(page.locator('#mvrMissingPrompt')).toBeHidden();
  expect(errors).toEqual([]);
});
