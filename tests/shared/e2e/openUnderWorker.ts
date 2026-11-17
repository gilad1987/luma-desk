import { expect, type Page } from '@playwright/test';
import { STORAGE_KEYS } from '../storageKeys';

// Test mode: frames run only when a test asks. Without it the 3D view renders without pause in software WebGL and
// takes the CPU the worker and the page need (on a loaded machine one page.evaluate took 31 s and the service-worker
// specs timed out). The worker treats this URL like any other page.
const TEST_MODE_PAGE = './?test';

/**
 * Opens the app in test mode and waits until the service worker has installed (addAll of the shell has finished) and
 * controls the page (clients.claim() has run), so every later request goes through it. The guide is marked as seen,
 * because on a first visit it covers the screen.
 */
export async function openUnderWorker(page: Page): Promise<void> {
  await page.addInitScript((key) => localStorage.setItem(key, '1'), STORAGE_KEYS.guideSeen);
  await page.goto(TEST_MODE_PAGE);
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => undefined));
  await expect.poll(() => page.evaluate(() => navigator.serviceWorker.controller !== null)).toBe(true);
}
