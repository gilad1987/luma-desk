import { expect, test } from '@playwright/test';
import { SYNTHETIC_MVR, bootApp, collectErrors, mvrFile, pickMvrFile, readMvrStage } from '../shared/e2e';

/** What the synthetic file holds: 2 fixtures on 1 embedded GDTF, 1 patched, no scenery objects. */
const SUMMARY_COUNTS = { fixtures: '2', unpatched: '1', missingGdtf: '0', objects: '0' };

test('a synthetic MVR builds its stage and shows the import summary', async ({ page }) => {
  const errors = collectErrors(page);
  const desk = await bootApp(page);
  await pickMvrFile(page, desk, SYNTHETIC_MVR);

  const summary = page.locator('#mvrSummary');
  await expect(summary).toBeVisible();
  for (const [count, text] of Object.entries(SUMMARY_COUNTS)) {
    await expect(summary.locator(`[data-count="${count}"]`)).toHaveText(text);
  }
  await page.locator('#mvrSummaryClose').click();
  await expect(summary).toBeHidden();

  const stage = await readMvrStage(desk);
  expect(stage).toMatchObject({ kind: 'mvr', fileName: SYNTHETIC_MVR.name, fixtureCount: 2 });
  expect(stage.patches).toEqual([
    { id: 101, patch: { universe: 2, address: 1, mode: 'Std' } },
    { id: 102, patch: null },
  ]);
  expect(errors).toEqual([]);
});

test('a file that is not a ZIP shows the MVR error and keeps the stage', async ({ page }) => {
  const desk = await bootApp(page);
  const before = await readMvrStage(desk);

  await pickMvrFile(page, desk, mvrFile('Broken.mvr', new TextEncoder().encode('not a zip archive')));
  // #mvrImportError keeps the MvrError text until the next import, so this does not race the 1.8 s toast
  await expect(page.locator('#mvrImportError')).toContainText('is not a readable ZIP archive');
  await expect(page.locator('#mvrSummary')).toBeHidden();
  expect(await readMvrStage(desk)).toEqual(before);
});
