/**
 * The Build Stage click when the Web Awesome chunk does not arrive, and when it comes twice: a failed chunk shows the
 * Hebrew toast and a later click still opens the builder (the browser does not keep the failed import), and a double
 * click builds one builder. The rejection handler itself is owned by wireBuilder.load.test; the chunk download and
 * its budget by builder-shell.network.
 */
import { expect, test } from '@playwright/test';
import { he } from '../../src/i18n/he';
import { bootApp, collectErrors } from '../shared/e2e';

const CHUNK = '**/assets/registerWa-*.js';

// Bug: a click whose chunk fails silently does nothing, or the failed import stays cached so every later click fails
// too until a reload; either would leave the user with a dead Build Stage button.
test('a blocked builder chunk shows the load toast, and the next click opens the builder', async ({ page }) => {
  const errors = collectErrors(page);
  await bootApp(page);
  await page.route(CHUNK, (route) => route.abort());
  await page.locator('#buildBtn').click();
  // an id: the toast is the app's one plain <div> status line, with no role
  await expect(page.locator('#toast')).toHaveText(he.builder.loadFailed);
  await expect(page.locator('section.builder')).toHaveCount(0);
  await page.unroute(CHUNK);
  await page.locator('#buildBtn').click();
  await expect(page.locator('section.builder')).toBeVisible();
  // the aborted request logs a resource error; anything else (an uncaught rejection above all) is a bug
  expect(errors.filter((e) => !e.startsWith('console: Failed to load resource'))).toEqual([]);
});

// Bug: each click of a double click awaits the chunk and then enters, so a second enter() that does not see the first
// would mount a second builder over the first.
test('a double click on Build Stage builds exactly one builder', async ({ page }) => {
  const errors = collectErrors(page);
  await bootApp(page);
  await page.locator('#buildBtn').dblclick();
  await page.locator('[data-template="theatre"]').click();
  await page.locator('[data-venue="sultans-pool"]').click();
  await expect(page.locator('section.builder.is-editing')).toBeVisible();
  expect([await page.locator('section.builder').count(), errors]).toEqual([1, []]);
});
