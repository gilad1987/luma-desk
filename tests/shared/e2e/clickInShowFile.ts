import type { Page } from '@playwright/test';
import { openShowFile } from './openShowFile';

/**
 * Clicks a button of the Show File dialog, opening the dialog first when it is closed. An import may leave the
 * dialog open or closed, so a spec that clicks after one cannot assume either.
 */
export async function clickInShowFile(page: Page, buttonId: string): Promise<void> {
  await openShowFile(page);
  await page.locator(`#${buttonId}`).click();
}
