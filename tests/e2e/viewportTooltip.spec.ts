/**
 * Owns the hover tooltip and the click pick in the 3D view: `#tip` names the fixture under the pointer, hover picks
 * wait 60 ms of desk time between them, and a click selects the fixture under it alone. Box select is in
 * viewportBoxSelect.spec.ts. The points are client pixels of the default MA layout at the suite viewport (1280x800);
 * the screenshot suite owns where the rig is drawn.
 */
import { expect, test, type JSHandle, type Page } from '@playwright/test';
import type { DeskTestApi } from '../shared';
import { bootApp, readDeskState, stepFrames } from '../shared/e2e';

/** A Beam of the upstage truss. */
const BEAM_201 = { x: 370, y: 90 };
/** Sky above the rig: nothing to pick there. */
const EMPTY = { x: 650, y: 50 };

/** Moves the desk clock `ms` forward (the hover pick reads it), then the pointer to `to`. */
async function hoverAfter(page: Page, desk: JSHandle<DeskTestApi>, ms: number, to: { x: number; y: number }) {
  await desk.evaluate((d, ms) => d.advance(ms), ms);
  await page.mouse.move(to.x, to.y);
}

const cursor = (page: Page) => page.locator('#c').evaluate((c) => c.style.cursor);

test('hovering a fixture shows its id and type beside the pointer; empty sky hides it', async ({ page }) => {
  const desk = await bootApp(page);
  await stepFrames(desk, 500, 2);
  const tip = page.locator('#tip');
  await hoverAfter(page, desk, 100, BEAM_201);
  await expect(tip).toHaveText('201 · Beam');
  const placed = await tip.evaluate((e) => [e.style.left, e.style.top]);
  expect([placed, await cursor(page)]).toEqual([['382px', '62px'], 'pointer']);
  await hoverAfter(page, desk, 100, EMPTY);
  await expect(tip).toBeHidden();
  expect(await cursor(page)).toBe('');
});

test('a hover pick waits 60 ms of desk time after the last one', async ({ page }) => {
  const desk = await bootApp(page);
  await stepFrames(desk, 500, 2);
  const tip = page.locator('#tip');
  await hoverAfter(page, desk, 100, BEAM_201);
  await expect(tip).toHaveText('201 · Beam');
  await hoverAfter(page, desk, 59, EMPTY);
  await expect(tip).toBeVisible();
  await hoverAfter(page, desk, 1, { x: EMPTY.x + 1, y: EMPTY.y });
  await expect(tip).toBeHidden();
});

test('a click on a fixture selects it alone and logs its id and type', async ({ page }) => {
  const desk = await bootApp(page);
  await stepFrames(desk, 500, 2);
  await desk.evaluate((d) => d.run('Fixture 202 Thru 205'));
  await page.mouse.click(BEAM_201.x, BEAM_201.y);
  await expect(page.locator('#cmdFb')).toContainText('Fixture 201 (Beam)');
  expect((await readDeskState(desk)).sel).toEqual([201]);
});
