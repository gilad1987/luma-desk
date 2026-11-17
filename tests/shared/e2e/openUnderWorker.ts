import { expect, type Page } from '@playwright/test';
import { STORAGE_KEYS } from '../storageKeys';

/**
 * Opens the app and waits until the service worker has installed (addAll of the shell has finished) and controls the
 * page (clients.claim() has run), so every later request goes through it. The guide is marked as seen, because on a
 * first visit it covers the screen.
 */
export async function openUnderWorker(page: Page): Promise<void> {
  await page.addInitScript((key) => localStorage.setItem(key, '1'), STORAGE_KEYS.guideSeen);
  await page.goto('./');
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => undefined));
  await expect.poll(() => page.evaluate(() => navigator.serviceWorker.controller !== null)).toBe(true);
}
