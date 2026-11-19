/**
 * The Stage Builder opens offline: the service worker precaches every built file on install, the lazy Web Awesome
 * chunk (`registerWa`) among them, so the Build Stage click works without a network. The boot offline is owned by
 * swOffline, the precache list by the swBuild unit test.
 */
import { expect, test, type Page, type Response } from '@playwright/test';
import { openBuilder, openUnderWorker } from '../shared/e2e';

// The main config blocks service workers so other tests see fresh files; this spec is about the worker's cache.
test.use({ serviceWorkers: 'allow' });

/** True once the module script has run to its end, where it publishes window.__desk. */
const appBooted = (page: Page): Promise<boolean> => page.evaluate(() => '__desk' in window);

test('offline, Build Stage opens the builder with its chunk from the service worker', async ({ page, context }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await openUnderWorker(page);
  await context.setOffline(true);
  await page.reload();
  await expect.poll(() => appBooted(page)).toBe(true);
  const chunks: Response[] = [];
  page.on('response', (response) => {
    if (/\/assets\/registerWa-[^/]+\.js$/.test(new URL(response.url()).pathname)) chunks.push(response);
  });
  await openBuilder(page);
  expect([chunks.map((chunk) => chunk.fromServiceWorker()), pageErrors]).toEqual([[true], []]);
});
