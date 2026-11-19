/**
 * The Stage Builder centre: the divider between the 3D pane and the plan pane follows the mouse and the 3D view
 * refits to its pane, and the Plan, Split and 3D buttons collapse one pane and bring the user's divider back. The
 * columns are owned by builder-shell.layout; the plan's content by the plan unit tests.
 */
import { expect, test, type Page } from '@playwright/test';
import { bootApp, boxOf, canvasSize, collectErrors, dragDivider, offBy, openBuilder } from '../shared/e2e';

// classes: the panes are plain <div> slots of the split panel, with no role or id
const view = (page: Page) => page.locator('.builder-3d');
const plan = (page: Page) => page.locator('.builder-plan');
const heightOf = async (page: Page, pane: 'view' | 'plan'): Promise<number> =>
  (await boxOf(pane === 'view' ? view(page) : plan(page)))[3];
// the button inside the one checked radio (strict: a second checked radio fails); the radio host itself has no name
// in Playwright, as wa-tooltip labels it by its hidden tooltip
const checkedMode = (page: Page) =>
  page.getByRole('radiogroup', { name: 'View' }).getByRole('radio', { checked: true }).getByRole('button');

test('dragging the divider 100 px down grows the 3D pane and shrinks the plan by 100 px', async ({ page }) => {
  const errors = collectErrors(page);
  await bootApp(page);
  await openBuilder(page);
  const [viewBefore, planBefore] = [await heightOf(page, 'view'), await heightOf(page, 'plan')];
  await dragDivider(page, 100);
  await expect
    .poll(async () =>
      offBy([await heightOf(page, 'view'), await heightOf(page, 'plan')], [viewBefore + 100, planBefore - 100], 4),
    )
    .toEqual([0, 0]);
  const paneBox = await boxOf(view(page));
  await expect.poll(async () => offBy(await canvasSize(page), paneBox.slice(2), 2)).toEqual([0, 0]);
  expect(errors).toEqual([]);
});

test('3D and Plan each collapse the other pane; Split brings the dragged divider back', async ({ page }) => {
  const errors = collectErrors(page);
  await bootApp(page);
  await openBuilder(page);
  const centre = page.locator('.builder-centre');
  const initialView = await heightOf(page, 'view');
  await dragDivider(page, 100);
  await expect.poll(() => heightOf(page, 'view')).toBeGreaterThan(initialView + 50);
  const dragged = await heightOf(page, 'view');

  // Bug: aria-pressed on the wa-button host never reached the accessibility tree, so no mode read as on
  await expect(checkedMode(page)).toHaveAccessibleName('Split');
  await page.getByRole('button', { name: '3D', exact: true }).click();
  await expect(centre).toHaveClass(/\bis-mode-3d\b/);
  await expect(checkedMode(page)).toHaveAccessibleName('3D');
  await expect.poll(() => heightOf(page, 'plan')).toBe(0);
  expect(errors).toEqual([]);

  await page.getByRole('button', { name: 'Plan', exact: true }).click();
  await expect(centre).toHaveClass(/\bis-mode-plan\b/);
  await expect(checkedMode(page)).toHaveAccessibleName('Plan');
  await expect.poll(() => heightOf(page, 'view')).toBe(0);
  // the collapsed pane keeps a 2 px viewer, or WebGL would draw into a zero-size framebuffer on every frame
  await expect.poll(async () => (await canvasSize(page))[1]).toBe(2);
  expect(errors).toEqual([]);

  await page.getByRole('button', { name: 'Split', exact: true }).click();
  await expect(centre).toHaveClass(/\bis-mode-split\b/);
  await expect(checkedMode(page)).toHaveAccessibleName('Split');
  await expect.poll(async () => offBy([await heightOf(page, 'view')], [dragged], 1)).toEqual([0]);
  expect(errors).toEqual([]);
});

test('3D mode stays 3D only when the window resizes', async ({ page }) => {
  const errors = collectErrors(page);
  await bootApp(page);
  await openBuilder(page);
  const centre = page.locator('.builder-centre');
  await page.getByRole('button', { name: '3D', exact: true }).click();
  await expect.poll(() => heightOf(page, 'plan')).toBe(0);
  await page.setViewportSize({ width: 1280, height: 600 });
  await expect.poll(async () => (await boxOf(centre))[3]).toBe(600 - 56);
  // the hidden divider keeps its 1 px track, so the 3D pane is the centre height within 1 px
  const shorter = offBy([await heightOf(page, 'plan'), await heightOf(page, 'view')], [0, 600 - 56], 1);
  await page.setViewportSize({ width: 1280, height: 800 });
  await expect.poll(async () => (await boxOf(centre))[3]).toBe(800 - 56);
  const restored = offBy([await heightOf(page, 'plan'), await heightOf(page, 'view')], [0, 800 - 56], 1);
  await expect(centre).toHaveClass(/\bis-mode-3d\b/);
  expect([shorter, restored, errors]).toEqual([[0, 0], [0, 0], []]);
});
