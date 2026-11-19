/**
 * The fixture gallery shot runner: for each catalogue product, the product next to its native base model in every
 * view, unlit and lit, plus a posed pair for moving heads. It writes PNGs for a person to check and asserts only
 * that each page drew. Run it with `npx playwright test -c playwright.gallery.config.ts`; `GALLERY_IDS` (a comma
 * list, default all) picks the products, `GALLERY_OUT` the folder.
 */
import { expect, test, type Page } from '@playwright/test';

/** What the page puts on `window.galleryIds` (`galleryMain.ts`); typed here, as a spec imports nothing from src. */
interface GalleryId {
  readonly id: string;
  readonly family: string;
}

const GALLERY_PAGE = 'src/render/fixtures/gallery/gallery.html';
const OUT = process.env['GALLERY_OUT'] ?? 'test-results/product-gallery';
const VIEWS = ['front34', 'side', 'below', 'floor'] as const;
const LIGHTS = [
  ['off', ''],
  ['lit', '&lit=1'],
] as const;
/** One page load and frame under software WebGL, with room to spare. */
const SHOT_BUDGET_MS = 30_000;

/** The ids the page lists, narrowed to `GALLERY_IDS`; an id the page does not know fails the run. */
async function readGalleryIds(page: Page): Promise<GalleryId[]> {
  await page.goto(`${GALLERY_PAGE}?id=`);
  await expect(page.locator('#error')).toBeVisible();
  const all = await page.evaluate(() => (window as unknown as { galleryIds: GalleryId[] }).galleryIds);
  const wanted = (process.env['GALLERY_IDS'] ?? '').split(',').map((id) => id.trim());
  if (wanted.every((id) => id === '')) return all;
  const unknown = wanted.filter((id) => id !== '' && !all.some((item) => item.id === id));
  expect(unknown, `GALLERY_IDS names ids the gallery does not know`).toStrictEqual([]);
  return all.filter((item) => wanted.includes(item.id));
}

async function shoot(page: Page, item: GalleryId, query: string, name: string): Promise<void> {
  await page.goto(`${GALLERY_PAGE}?id=${item.id}${query}`);
  await expect(page.locator('body')).toHaveAttribute('data-ready', '1');
  await page.screenshot({ path: `${OUT}/${item.family}/${item.id}-${name}.png` });
}

test('shoots each product next to its native base model', async ({ page }) => {
  const items = await readGalleryIds(page);
  test.setTimeout((items.length * (VIEWS.length + 1) * LIGHTS.length + 1) * SHOT_BUDGET_MS);
  for (const item of items) {
    await test.step(item.id, async () => {
      for (const view of VIEWS)
        for (const [light, query] of LIGHTS) await shoot(page, item, `&view=${view}${query}`, `${view}-${light}`);
      if (item.family !== 'mover') return;
      for (const [light, query] of LIGHTS)
        await shoot(page, item, `&view=front34&pan=30&tilt=45${query}`, `front34-posed-${light}`);
    });
  }
});
