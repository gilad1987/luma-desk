/**
 * Owns box select in the 3D view: Shift+drag draws `#selRect` and adds every fixture inside the box to the
 * selection; a Shift click with no drag adds nothing. A plain click and the hover tooltip are in
 * viewportTooltip.spec.ts. The points are client pixels of the default MA layout at the suite viewport (1280x800),
 * where the viewer fills the page below the 40 px top bar; the screenshot suite owns where the rig is drawn.
 */
import { expect, test, type Page } from '@playwright/test';
import { bootApp, collectErrors, readDeskState, stepFrames } from '../shared/e2e';

const BOX_FROM = { x: 480, y: 150 };
const BOX_TO = { x: 800, y: 340 };
/** Sky above the rig: nothing to pick there. */
const EMPTY = { x: 650, y: 50 };
const ids = (from: number, to: number): number[] => Array.from({ length: to - from + 1 }, (_, i) => from + i);
/** The fixtures the box covers, as the original page (3cbff92) selected them with this same drag. */
const BOX_HITS = [
  ...[...ids(706, 735), ...ids(1004, 1013), ...ids(1101, 1120), ...ids(1206, 1220), ...ids(1410, 1414), 1416],
  ...[...ids(1505, 1508), ...ids(1603, 1608), ...ids(1703, 1708), 2001, ...ids(2103, 2110)],
];

/** Presses Shift and the primary button at `from`, moves to `to` in steps, releases both. */
async function shiftDrag(page: Page, from: { x: number; y: number }, to: { x: number; y: number }): Promise<void> {
  await page.keyboard.down('Shift');
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(to.x, to.y, { steps: 4 });
}

async function release(page: Page): Promise<void> {
  await page.mouse.up();
  await page.keyboard.up('Shift');
}

test('Shift+drag shows the box, then adds every fixture inside it to the selection', async ({ page }) => {
  const errors = collectErrors(page);
  const desk = await bootApp(page);
  await stepFrames(desk, 500, 2);
  await desk.evaluate((d) => d.run('Fixture 201'));
  const rect = page.locator('#selRect');
  await shiftDrag(page, BOX_FROM, BOX_TO);
  await expect(rect).toBeVisible();
  const drawn = await rect.evaluate((e) => [e.style.left, e.style.top, e.style.width, e.style.height]);
  await release(page);
  await expect(rect).toBeHidden();
  expect([drawn, (await readDeskState(desk)).sel]).toEqual([
    ['480px', '110px', '320px', '190px'],
    [201, ...BOX_HITS],
  ]);
  await expect(page.locator('#cmdFb')).toContainText(`Box select +${BOX_HITS.length}`);
  expect(errors).toEqual([]);
});

test('a Shift click with no drag adds nothing by box', async ({ page }) => {
  const desk = await bootApp(page);
  await stepFrames(desk, 500, 2);
  await desk.evaluate((d) => d.run('Fixture 201'));
  await shiftDrag(page, EMPTY, EMPTY);
  await release(page);
  await expect(page.locator('#selRect')).toBeHidden();
  const feedback = await page.locator('#cmdFb').innerText();
  expect([(await readDeskState(desk)).sel, feedback.includes('Box select')]).toEqual([[201], false]);
});
