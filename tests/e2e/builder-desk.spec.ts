/**
 * The desk around the open Stage Builder. The builder covers the whole window, but in the classic layout the encoders,
 * the executors and the command line stay in the page under it, so they are inert while it is open: a click or the
 * Tab key must not reach them, and after Done they work again. In every layout the 3D view (`#viewer`) moves into the
 * builder's 3D pane, the renderer refits to the pane, and Cancel puts it back in its place on the desk. The builder
 * screens are owned by builder-flow, the shell layout by builder-shell.*.
 */
import { expect, test, type Page } from '@playwright/test';
import { bootApp, boxOf, canvasSize, collectErrors, offBy, openBuilder } from '../shared/e2e';

const DESK_AREAS = '#side, #enc, #desk';

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
  test(`${layout}: the 3D view fills the builder's 3D pane, then Cancel puts it back`, async ({ page }) => {
    const errors = collectErrors(page);
    await bootApp(page, { layout });
    const viewer = page.locator('#viewer');
    const before = await boxOf(viewer);
    await openBuilder(page);
    // a class: the 3D pane is a plain <div> slot of the split panel, with no role or id
    const pane = page.locator('section.builder .builder-3d');
    await expect(pane.locator('#viewer')).toHaveCount(1);
    const paneBox = await boxOf(pane);
    expect(offBy(await boxOf(viewer), paneBox, 1)).toEqual([0, 0, 0, 0]);
    await expect.poll(async () => offBy(await canvasSize(page), paneBox.slice(2), 2)).toEqual([0, 0]);
    await page.locator('[data-builder="cancel"]').click();
    await expect(page.locator('section.builder')).toHaveCount(0);
    expect(await page.evaluate(() => document.querySelector('#main')?.firstElementChild?.id)).toBe('viewer');
    await expect.poll(() => boxOf(viewer)).toEqual(before);
    expect(errors).toEqual([]);
  });
}
