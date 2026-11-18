import type { Page } from '@playwright/test';

/**
 * Opens the Show File dialog when it is closed. The dialog's markup exists only while it is open, and an import
 * replaces its body with the summary, so a spec cannot assume the MVR row is on the page.
 */
export async function openShowFile(page: Page): Promise<void> {
  if ((await page.locator('#fMvrFile').count()) === 0) await page.locator('#fileBtn').click();
}
