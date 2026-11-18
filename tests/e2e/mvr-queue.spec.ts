import { expect, test } from '@playwright/test';
import { SYNTHETIC_MVR, bootApp, collectErrors, countStoredMvrFiles, mvrFile, readMvrStage } from '../shared/e2e';

/** The same bytes under another name: the stage names its file, so the name tells which of two picks won. */
const SECOND_PICK = mvrFile('Second.mvr', SYNTHETIC_MVR.buffer);

test('two files picked one right after the other end on the second, with one summary', async ({ page }) => {
  const errors = collectErrors(page);
  const desk = await bootApp(page);
  await page.locator('#fileBtn').click();
  // both picks land in one task, so the first load surely still runs when the second is picked; the MVR load queue
  // must run the second after it, never next to it (the summary of the first would also hide the input)
  const picks = [SYNTHETIC_MVR, SECOND_PICK].map(({ name, buffer }) => ({ name, bytes: [...buffer] }));
  await page.locator('#fMvrFile').evaluate((element, files) => {
    const input = element as HTMLInputElement;
    for (const { name, bytes } of files) {
      const transfer = new DataTransfer();
      transfer.items.add(new File([new Uint8Array(bytes)], name));
      input.files = transfer.files;
      input.dispatchEvent(new Event('change'));
    }
  }, picks);
  await desk.evaluate((d) => d.mvrReady());

  expect(await readMvrStage(desk)).toMatchObject({ kind: 'mvr', fileName: SECOND_PICK.name, fixtureCount: 2 });
  await expect(page.locator('#mvrSummary')).toHaveCount(1);
  expect(await page.evaluate(() => window.__desk.fixtures.map((f) => f.id))).toEqual([101, 102]);
  // one file by SHA-256: the same bytes are stored once
  expect(await countStoredMvrFiles(page)).toBe(1);
  expect(errors).toEqual([]);
});

test('Export MVR clicked while an import runs downloads the imported stage', async ({ page }) => {
  const errors = collectErrors(page);
  const desk = await bootApp(page);
  await page.locator('#fileBtn').click();
  const input = page.locator('#fMvrFile');
  // Export is clicked in the same task as the pick, after the app's own `onchange` queued the import: the summary
  // replaces the dialog when the import ends, so a later click could not reach the button at all
  await input.evaluate((element) =>
    element.addEventListener('change', () => document.getElementById('fMvrExport')?.click(), { once: true }),
  );
  const download = page.waitForEvent('download');
  await input.setInputFiles(SYNTHETIC_MVR);
  await desk.evaluate((d) => d.mvrReady());

  expect((await download).suggestedFilename()).toBe(SYNTHETIC_MVR.name);
  expect(await readMvrStage(desk)).toMatchObject({ kind: 'mvr', fileName: SYNTHETIC_MVR.name });
  expect(errors).toEqual([]);
});
