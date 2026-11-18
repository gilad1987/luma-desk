import { expect, test } from '@playwright/test';
import {
  SYNTHETIC_MVR,
  bootApp,
  collectErrors,
  expectPatchesKept,
  exportAndImport,
  pickMvrFile,
  readMvrStage,
} from '../shared/e2e';

test('an exported MVR downloads and imports back with the same fixtures and patch', async ({ page }) => {
  const errors = collectErrors(page);
  const desk = await bootApp(page);
  await pickMvrFile(page, desk, SYNTHETIC_MVR);
  await page.locator('#mvrSummaryClose').click();
  const imported = await readMvrStage(desk);

  const fileName = await exportAndImport(page, desk);
  expect(fileName).toMatch(/\.mvr$/);
  const reimported = await readMvrStage(desk);
  expect(reimported).toMatchObject({ kind: 'mvr', fileName, fixtureCount: imported.fixtureCount });
  expectPatchesKept(imported.patches, reimported.patches);
  expect(errors).toEqual([]);
});
