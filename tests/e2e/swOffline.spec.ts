import { expect, test, type Page } from '@playwright/test';
import { NETWORK_ERROR, cacheContents, fetchStatus, openUnderWorker, storedPage } from '../shared/e2e';

// What the service worker answers without a network (docs/known-quirks.md, section I). The main config blocks
// service workers so other tests see fresh files; this spec is about the worker itself.
test.use({ serviceWorkers: 'allow' });

/** True once the module script has run to its end, where it publishes window.__desk. */
const appBooted = (page: Page): Promise<boolean> => page.evaluate(() => '__desk' in window);

test('the app boots offline from the cache', async ({ page, context }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await openUnderWorker(page);
  await expect.poll(() => appBooted(page)).toBe(true);

  const script = await page.locator('script[type="module"][src]').evaluate((el) => (el as HTMLScriptElement).src);
  expect(script).toMatch(/\/assets\/index-[\w-]+\.js$/);
  const caches = await cacheContents(page);
  expect(Object.keys(caches)).toEqual([expect.stringMatching(/^luma-desk-[0-9a-f]{10}$/)]);
  expect(Object.values(caches)[0]).toContain(script);

  await context.setOffline(true);
  await page.reload();
  await expect.poll(() => appBooted(page)).toBe(true);
  await expect(page.locator('#cmd')).toBeVisible();
  await expect(page.locator('#c')).toBeAttached();
  // proves the worker's own fetches are offline too, so the boot above came from the cache
  expect(await fetchStatus(page, `./not-cached-${Date.now()}`)).toBe(NETWORK_ERROR);
  expect(pageErrors).toEqual([]);
});

test('offline, a never visited deep path gets the stored page (I2)', async ({ page, context }) => {
  await openUnderWorker(page);
  const stored = await storedPage(page);
  await context.setOffline(true);

  const response = await page.goto('./deep/never/visited');

  expect(response?.fromServiceWorker()).toBe(true);
  expect(await response?.text()).toBe(stored);
});

test('offline, reads ignore the query string (I4)', async ({ page, context }) => {
  await openUnderWorker(page);
  await context.setOffline(true);
  expect(await fetchStatus(page, './manifest.webmanifest?v=offline')).toBe(200);
});

test('offline, a non-GET request is left to the network and fails', async ({ page, context }) => {
  await openUnderWorker(page);
  await context.setOffline(true);
  expect(await fetchStatus(page, './manifest.webmanifest')).toBe(200);
  expect(await fetchStatus(page, './manifest.webmanifest', 'POST')).toBe(NETWORK_ERROR);
});
