import { expect, test } from '@playwright/test';
import {
  UNUSABLE_MVR_FILES,
  bootApp,
  collectErrors,
  countStoredMvrFiles,
  pickMvrFile,
  readMvrStage,
} from '../shared/e2e';

for (const [label, { file, error }] of Object.entries(UNUSABLE_MVR_FILES)) {
  test(`a file ${label} shows the MVR error, keeps the stage and stores nothing`, async ({ page }) => {
    const errors = collectErrors(page);
    const desk = await bootApp(page);
    const before = await readMvrStage(desk);

    await pickMvrFile(page, desk, file);
    await expect(page.locator('#mvrImportError')).toContainText(error);
    await expect(page.locator('#mvrSummary')).toBeHidden();
    expect(await readMvrStage(desk)).toEqual(before);
    // the import stores the bytes before it parses them, so a refused file must be taken out again
    expect(await countStoredMvrFiles(page)).toBe(0);
    expect(errors).toEqual([]);
  });
}
