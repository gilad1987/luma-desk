import { readFile } from 'node:fs/promises';
import type { JSHandle, Page } from '@playwright/test';
import type { DeskTestApi } from '../deskApi';
import { clickInShowFile } from './clickInShowFile';
import { pickMvrFile } from './pickMvrFile';
import { mvrFile } from './syntheticMvr';

/**
 * Exports the stage with Export MVR and imports the downloaded bytes again, the round trip a user makes between two
 * consoles. The download is the real `<a download>` file, so the bytes are what a user gets. Returns its file name.
 * Close the import summary first: it takes the place of the Show File dialog body.
 */
export async function exportAndImport(page: Page, desk: JSHandle<DeskTestApi>): Promise<string> {
  const downloading = page.waitForEvent('download');
  await clickInShowFile(page, 'fMvrExport');
  const download = await downloading;
  // Export runs in the MVR load queue: the download can arrive before its job ends
  await desk.evaluate((d) => d.mvrReady());
  const name = download.suggestedFilename();
  await pickMvrFile(page, desk, mvrFile(name, await readFile(await download.path())));
  return name;
}
