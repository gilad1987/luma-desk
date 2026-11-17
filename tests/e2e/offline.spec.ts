import { expect, test, type Page } from '@playwright/test';

// The main config blocks service workers so tests see fresh files; this spec is about the worker itself.
test.use({ serviceWorkers: 'allow' });

/** The cache names on the origin and the URLs each one holds. */
async function cacheContents(page: Page): Promise<Record<string, string[]>> {
  return page.evaluate(async () => {
    const entries = await Promise.all(
      (await caches.keys()).map(async (name) => {
        const requests = await (await caches.open(name)).keys();
        return [name, requests.map((request) => request.url)] as const;
      }),
    );
    return Object.fromEntries(entries);
  });
}

/** True once the module script has run to its end, where it publishes window.__desk. */
const appBooted = (page: Page): Promise<boolean> => page.evaluate(() => '__desk' in window);

test('the app boots offline from the service worker cache', async ({ page, context }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await page.addInitScript(() => localStorage.setItem('lumadesk-guide-seen', '1'));

  await page.goto('./');
  await expect.poll(() => appBooted(page)).toBe(true);
  // ready: install (addAll of the shell) has finished; controller: clients.claim() has run
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => undefined));
  await expect.poll(() => page.evaluate(() => navigator.serviceWorker.controller !== null)).toBe(true);

  const script = await page.locator('script[type="module"][src]').evaluate((el) => (el as HTMLScriptElement).src);
  expect(script).toMatch(/\/assets\/index-[\w-]+\.js$/);
  const caches = await cacheContents(page);
  const names = Object.keys(caches);
  expect(names).toHaveLength(1);
  expect(names[0]).toMatch(/^luma-desk-[0-9a-f]+$/);
  expect(caches[names[0] ?? '']).toContain(script);

  await context.setOffline(true);
  await page.reload();
  await expect.poll(() => appBooted(page)).toBe(true);
  await expect(page.locator('#cmd')).toBeVisible();
  await expect(page.locator('#c')).toBeAttached();
  // proves the worker's own fetches are offline too, so the boot above came from the cache
  const uncached = await page.evaluate(() =>
    fetch(`./not-cached-${Date.now()}`).then(
      () => 'loaded',
      () => 'failed',
    ),
  );
  expect(uncached).toBe('failed');
  expect(pageErrors).toEqual([]);
});
