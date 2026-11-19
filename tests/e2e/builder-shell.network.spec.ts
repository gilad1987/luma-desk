/**
 * The Stage Builder shell's network and load boundary: a builder visit fetches nothing from another origin (no CDN, no
 * icon font), the desk boots without Web Awesome and gets it only on the Build Stage click, and that chunk stays under
 * its 600 KB budget. The boot's own Google Fonts request comes before `bootApp` resolves, so it is not counted here.
 * The offline open is owned by builder-offline, the layout by builder-shell.layout and builder-shell.divider.
 */
import { expect, test, type Page } from '@playwright/test';
import { bootApp, boxOf, collectErrors, dragDivider, openBuilder } from '../shared/e2e';

/** The budget of what the Build Stage click downloads (JS and CSS, decoded bytes): docs/plan/stage-builder-dnd/01-shell.md. */
const CHUNK_BUDGET_BYTES = 600_000;

/** What the page reports about Web Awesome: whether `wa-button` is defined and the brand token on the root. */
const waState = (page: Page) =>
  page.evaluate(() => [
    customElements.get('wa-button') !== undefined,
    getComputedStyle(document.documentElement).getPropertyValue('--wa-color-brand-50'),
  ]);

test('a builder visit with every mode, a drag and a resize asks no other origin', async ({ page }) => {
  const errors = collectErrors(page);
  await bootApp(page);
  const offOrigin: string[] = [];
  page.on('request', (request) => {
    if (new URL(request.url()).origin !== new URL(page.url()).origin) offOrigin.push(request.url());
  });
  await openBuilder(page);
  for (const mode of ['3D', 'Plan', 'Split']) await page.getByRole('radio', { name: mode, exact: true }).click();
  await dragDivider(page, 100);
  await page.setViewportSize({ width: 1000, height: 700 });
  // a class: the narrow layout's library rail shows the resize has reached the shell
  await expect.poll(async () => (await boxOf(page.locator('.builder-library')))[2]).toBe(56);
  // the page's own DOM, not the shadow roots: the builder draws its icons as inline SVG and has no wa-icon; a request
  // for an icon from any library would show in `offOrigin`
  const icons = await page.evaluate(() => document.querySelectorAll('wa-icon').length);
  await page.locator('[data-builder="done"]').click();
  await expect(page.locator('section.builder')).toHaveCount(0);
  expect([offOrigin, icons, errors]).toEqual([[], 0, []]);
});

test('the desk boots without Web Awesome; Build Stage loads it and Done leaves the 3D view in place', async ({
  page,
}) => {
  await bootApp(page);
  const viewerBefore = await boxOf(page.locator('#viewer'));
  const atBoot = await waState(page);
  await openBuilder(page);
  await page.locator('[data-builder="done"]').click();
  await expect(page.locator('section.builder')).toHaveCount(0);
  const [defined, brand] = await waState(page);
  expect([atBoot, defined, brand !== '']).toEqual([[false, ''], true, true]);
  await expect.poll(() => boxOf(page.locator('#viewer'))).toEqual(viewerBefore);
});

test('the Build Stage click downloads the registerWa chunk, all under the 600 KB budget', async ({
  page,
}, testInfo) => {
  await bootApp(page);
  const downloads: Promise<[string, number]>[] = [];
  page.on('response', (response) => {
    const { pathname } = new URL(response.url());
    if (!/\/assets\/[^/]+\.(js|css)$/.test(pathname)) return;
    const name = pathname.slice(pathname.lastIndexOf('/') + 1);
    downloads.push(response.body().then((body): [string, number] => [name, body.length]));
  });
  await openBuilder(page);
  const sizes = Object.fromEntries(await Promise.all(downloads));
  await testInfo.attach('builder-chunk.json', {
    body: JSON.stringify(sizes, null, 2),
    contentType: 'application/json',
  });
  const total = Object.values(sizes).reduce((sum, bytes) => sum + bytes, 0);
  expect({ underBudget: total < CHUNK_BUDGET_BYTES, files: Object.keys(sizes) }).toEqual({
    underBudget: true,
    files: expect.arrayContaining([expect.stringMatching(/registerWa-.*\.js$/)]),
  });
});
