import { readFileSync, writeFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';

// The main config blocks service workers so tests see fresh files; this spec is about the worker itself and checks
// it against the old hand-written sw.js (docs/known-quirks.md, section I). Serial: one test edits dist/index.html.
test.use({ serviceWorkers: 'allow' });
test.describe.configure({ mode: 'serial' });

/** Opens the app and waits until install (addAll of the shell) has finished and clients.claim() has run. */
async function openUnderWorker(page: Page): Promise<void> {
  await page.addInitScript(() => localStorage.setItem('lumadesk-guide-seen', '1'));
  await page.goto('./');
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => undefined));
  await expect.poll(() => page.evaluate(() => navigator.serviceWorker.controller !== null)).toBe(true);
}

/** The cache names on the origin and the URLs each one holds. */
const cacheContents = (page: Page): Promise<Record<string, string[]>> =>
  page.evaluate(async () => {
    const urlsOf = async (name: string) => (await (await caches.open(name)).keys()).map((request) => request.url);
    const names = await caches.keys();
    return Object.fromEntries(await Promise.all(names.map(async (name) => [name, await urlsOf(name)] as const)));
  });

/** Every cached URL, whatever the cache. */
const cachedUrls = async (page: Page): Promise<string[]> => Object.values(await cacheContents(page)).flat();

/** The page every navigation falls back to offline (quirk I2), or 'MISSING'. */
const storedPage = (page: Page): Promise<string> =>
  page.evaluate(async () => (await caches.match('./index.html'))?.text() ?? 'MISSING');

/** The status of a fetch made by the page, or -1 when it fails with a network error. */
const fetchStatus = (page: Page, request: { url: string; method?: string }): Promise<number> =>
  page.evaluate(async ({ url, method }) => (await fetch(url, { method }).catch(() => null))?.status ?? -1, request);

test('offline, the app boots from the cache', async ({ page, context }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await openUnderWorker(page);
  const script = await page.locator('script[type="module"][src]').evaluate((el) => (el as HTMLScriptElement).src);
  expect(script).toMatch(/\/assets\/index-[\w-]+\.js$/);
  const caches = await cacheContents(page);
  expect(Object.keys(caches)).toEqual([expect.stringMatching(/^luma-desk-[0-9a-f]{10}$/)]);
  expect(Object.values(caches)[0]).toContain(script);

  await context.setOffline(true);
  await page.reload();
  await expect.poll(() => page.evaluate(() => '__desk' in window)).toBe(true);
  await expect(page.locator('#cmd')).toBeVisible();
  await expect(page.locator('#c')).toBeAttached();
  // proves the worker's own fetches are offline too, so the boot above came from the cache
  expect(await fetchStatus(page, { url: `./not-cached-${Date.now()}` })).toBe(-1);
  expect(pageErrors).toEqual([]);
});

test('offline, a never visited deep path gets the stored page', async ({ page, context }) => {
  await openUnderWorker(page);
  const stored = await storedPage(page);
  await context.setOffline(true);
  const response = await page.goto('./deep/never/visited');
  expect(response?.fromServiceWorker()).toBe(true);
  expect(await response?.text()).toBe(stored);
});

test('offline, reads ignore the query (I4); a non-GET request goes to the network', async ({ page, context }) => {
  await openUnderWorker(page);
  await context.setOffline(true);
  expect(await fetchStatus(page, { url: './manifest.webmanifest?v=offline' })).toBe(200);
  expect(await fetchStatus(page, { url: './manifest.webmanifest', method: 'POST' })).toBe(-1);
});

test('online, a page comes from the network first and is stored as ./index.html (I2)', async ({ page }) => {
  await openUnderWorker(page);
  const original = readFileSync('dist/index.html', 'utf8');
  try {
    writeFileSync('dist/index.html', `${original}<!-- deployed again -->`);
    const response = await page.reload();
    expect(response?.fromServiceWorker()).toBe(true);
    expect(await response?.text()).toContain('deployed again');
    await expect.poll(() => storedPage(page)).toContain('deployed again');
  } finally {
    writeFileSync('dist/index.html', original);
  }
});

test('online, a page with a query is stored as ./index.html, other files under their full URL', async ({ page }) => {
  await openUnderWorker(page);
  await page.goto('./?from=nav');
  await expect.poll(() => storedPage(page)).not.toBe('MISSING');
  expect(await fetchStatus(page, { url: './manifest.webmanifest?v=online' })).toBe(200);
  await expect.poll(() => cachedUrls(page)).toContainEqual(expect.stringContaining('manifest.webmanifest?v=online'));
  expect((await cachedUrls(page)).filter((url) => url.includes('from=nav'))).toEqual([]);
});

test('online, Google Fonts responses are cached, opaque or not (I6)', async ({ page }) => {
  await openUnderWorker(page);
  await page.reload();
  await expect.poll(() => cachedUrls(page)).toContainEqual(expect.stringContaining('//fonts.googleapis.com/css2'));
});
