import type { Page } from '@playwright/test';

/**
 * Reads one localStorage key and parses it; null if the key is absent. Specs compare what the app wrote, not what
 * it holds in memory, because the stored text is what the next visit loads.
 */
export async function readStoredJson(page: Page, key: string): Promise<unknown> {
  const text = await page.evaluate((k) => localStorage.getItem(k), key);
  return text === null ? null : (JSON.parse(text) as unknown);
}
