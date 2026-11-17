import { expect, test, type Page } from '@playwright/test';
import { NO_STORED_PAGE, cacheContents, fetchStatus, openUnderWorker, storedPage } from '../shared';

// What the service worker stores while online (docs/known-quirks.md, section I). The main config blocks service
// workers so other tests see fresh files; this spec is about the worker itself.
test.use({ serviceWorkers: 'allow' });

/** Every cached URL, whatever the cache. */
async function cachedUrls(page: Page): Promise<string[]> {
  return Object.values(await cacheContents(page)).flat();
}

test('a page comes from the network first and is stored as ./index.html (I2)', async ({ page, context }) => {
  await openUnderWorker(page);
  const pageUrl = page.url();
  // a new deploy, simulated on the worker's own fetch instead of on the shared dist/ folder
  await context.route(
    (url) => url.href === pageUrl,
    async (route) => {
      const response = await route.fetch();
      await route.fulfill({ response, body: `${await response.text()}<!-- deployed again -->` });
    },
  );

  const response = await page.reload();

  expect(response?.fromServiceWorker()).toBe(true);
  expect(await response?.text()).toContain('deployed again');
  await expect.poll(() => storedPage(page)).toContain('deployed again');
});

test('a page with a query string is stored as ./index.html, not under its own URL (I2)', async ({ page }) => {
  await openUnderWorker(page);
  await page.evaluate(async () => {
    for (const name of await caches.keys()) await (await caches.open(name)).delete('./index.html');
  });
  expect(await storedPage(page)).toBe(NO_STORED_PAGE);

  await page.goto('./?from=nav');

  await expect.poll(() => storedPage(page)).not.toBe(NO_STORED_PAGE);
  expect((await cachedUrls(page)).filter((url) => url.includes('from=nav'))).toEqual([]);
});

test('other files are stored under their full URL, query string included', async ({ page }) => {
  await openUnderWorker(page);
  expect(await fetchStatus(page, './manifest.webmanifest?v=online')).toBe(200);
  await expect.poll(() => cachedUrls(page)).toContainEqual(expect.stringContaining('manifest.webmanifest?v=online'));
});

test('Google Fonts responses are cached, opaque or not (I6)', async ({ page }) => {
  await openUnderWorker(page);
  await page.reload();
  await expect
    .poll(() => cachedUrls(page))
    .toContainEqual(expect.stringContaining('https://fonts.googleapis.com/css2'));
});
