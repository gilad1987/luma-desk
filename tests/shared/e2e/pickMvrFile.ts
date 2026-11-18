import type { JSHandle, Page } from '@playwright/test';
import type { DeskTestApi } from '../deskApi';
import { openShowFile } from './openShowFile';
import type { MvrFile } from './syntheticMvr';

/**
 * Picks an `.mvr` in the Show File dialog's file input and waits until that load ended, with success or failure
 * (`mvrReady`). Close the import summary first: it takes the place of the dialog body.
 */
export async function pickMvrFile(page: Page, desk: JSHandle<DeskTestApi>, file: MvrFile): Promise<void> {
  await openShowFile(page);
  await page.locator('#fMvrFile').setInputFiles(file);
  await desk.evaluate((d) => d.mvrReady());
}
