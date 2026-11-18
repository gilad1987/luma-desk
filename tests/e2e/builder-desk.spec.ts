/**
 * The desk around the open Stage Builder. In the classic layout the encoders, the executors and the command line stay
 * on show under the builder's open middle cell, so they are inert while it is open: a click or the Tab key must not
 * reach them, and after Done they work again. In every layout the 3D view keeps its place under the builder (the
 * hidden top bar must not move it into the 40 px row). The builder screens themselves are owned by builder-flow.
 */
import { expect, test, type Page } from '@playwright/test';
import { bootApp, collectErrors } from '../shared/e2e';

const DESK_AREAS = '#side, #enc, #desk';

/** Opens the builder from the top bar on the Theatre template at the Sultan's Pool venue. */
async function openBuilder(page: Page): Promise<void> {
  await page.locator('#buildBtn').click();
  await page.locator('[data-template="theatre"]').click();
  await page.locator('[data-venue="sultans-pool"]').click();
  await expect(page.locator('section.builder.is-editing')).toBeVisible();
}

/** Clicks the centre of `selector` with the mouse and returns the id of the area the click reached, or ''. */
async function clickCentre(page: Page, selector: string): Promise<string> {
  const box = await page.locator(selector).first().boundingBox();
  if (!box) throw new Error(`clickCentre: ${selector} has no box`);
  // The handle resolves when the listener is attached. A plain evaluate that is not awaited can attach it after
  // the click has gone by, and then the test waits for a click that never comes.
  const reached = await page.evaluateHandle(
    (areas) => ({
      click: new Promise<string>((resolve) =>
        document.addEventListener(
          'click',
          (ev) => resolve(ev.target instanceof Element ? (ev.target.closest(areas)?.id ?? '') : ''),
          { once: true, capture: true },
        ),
      ),
    }),
    DESK_AREAS,
  );
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  return reached.evaluate((r) => r.click);
}

/** Presses Tab `count` times and returns the desk area each focus stop lies in ('' outside the desk). */
async function tabStops(page: Page, count: number): Promise<string[]> {
  const stops: string[] = [];
  for (let i = 0; i < count; i++) {
    await page.keyboard.press('Tab');
    stops.push(await page.evaluate((areas) => document.activeElement?.closest(areas)?.id ?? '', DESK_AREAS));
  }
  return stops;
}

const viewerBox = (page: Page) => page.locator('#viewer').boundingBox();

test('classic: while building, clicks and Tab never reach the desk; after Done they do', async ({ page }) => {
  const errors = collectErrors(page);
  await bootApp(page, { layout: 'classic' });
  await openBuilder(page);
  expect([await clickCentre(page, '#cmd'), await clickCentre(page, '#execs .ex-top')]).toEqual(['', '']);
  await expect(page.locator('#cmd')).not.toBeFocused();
  expect((await tabStops(page, 80)).filter(Boolean)).toEqual([]);
  await page.locator('[data-builder="done"]').click();
  await expect(page.locator('section.builder')).toHaveCount(0);
  expect(await clickCentre(page, '#cmd')).toBe('desk');
  await expect(page.locator('#cmd')).toBeFocused();
  expect((await tabStops(page, 80)).filter(Boolean)).not.toEqual([]);
  expect(errors).toEqual([]);
});

for (const layout of ['classic', 'desk', 'ma'] as const) {
  test(`${layout}, saved: boots clean, the builder opens and the 3D view keeps its top`, async ({ page }) => {
    const errors = collectErrors(page);
    await bootApp(page, { layout });
    const before = await viewerBox(page);
    await openBuilder(page);
    const building = await viewerBox(page);
    expect(building?.y).toBe(before?.y);
    expect(building?.height).toBeGreaterThanOrEqual(before?.height ?? Infinity);
    await page.locator('[data-builder="cancel"]').click();
    await expect(page.locator('section.builder')).toHaveCount(0);
    expect(errors).toEqual([]);
  });
}
