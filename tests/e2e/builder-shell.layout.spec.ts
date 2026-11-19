/**
 * The Stage Builder shell's columns on a wide and a narrow screen: the column widths, the bar height, the 44 px touch
 * targets of the bar, the centre panes sharing the height, the narrow screen's icon rail and inspector drawer, and the
 * bar fitting an iPad portrait window. The
 * divider and the view modes are owned by builder-shell.divider, the network boundary by builder-shell.network, and
 * the tools inside the inspector by builder-flow.
 */
import { expect, test, type Page } from '@playwright/test';
import { bootApp, boxOf, collectErrors, offBy, openBuilder } from '../shared/e2e';

// classes throughout: the shell's columns and panes are plain <aside>/<div> elements with no role or id; the
// <aside> elements have no name, and #side is a third one
const width = async (page: Page, selector: string): Promise<number> => (await boxOf(page.locator(selector)))[2];
const height = async (page: Page, selector: string): Promise<number> => (await boxOf(page.locator(selector)))[3];

test('wide (1280 px): library 300, inspector 320, bar 56, bar buttons 44 px, the panes share the centre', async ({
  page,
}) => {
  const errors = collectErrors(page);
  await bootApp(page);
  await openBuilder(page);
  const [, viewY, , viewHeight] = await boxOf(page.locator('.builder-3d'));
  const [, planY, , planHeight] = await boxOf(page.locator('.builder-plan'));
  const divider = planY - (viewY + viewHeight);
  const centreHeight = await height(page, '.builder-centre');
  expect([
    await width(page, '.builder-library'),
    await width(page, '.builder-inspector'),
    await height(page, '.builder-bar'),
    ...offBy([viewHeight + planHeight], [centreHeight - divider], 2),
    // the builder is English and left-to-right inside the Hebrew page (U8)
    await page.locator('section.builder').evaluate((host) => getComputedStyle(host).direction),
  ]).toEqual([300, 320, 56, 0, 'ltr']);
  // the Inspector button is hidden on a wide screen (it opens the narrow screen's drawer), so only shown buttons count
  const buttons = page.locator('.builder-bar wa-button:visible');
  const small = await buttons.evaluateAll((all) =>
    all
      .map((b) => ({ id: b.id || b.textContent?.trim(), box: b.getBoundingClientRect() }))
      .filter(({ box }) => box.width < 44 || box.height < 44)
      .map(({ id, box }) => `${id}: ${box.width}x${box.height}`),
  );
  expect([(await buttons.count()) > 0, small]).toEqual([true, []]);
  expect(errors).toEqual([]);
});

test('narrow (1024 px): a 56 px library rail, Plan first, and the inspector in a drawer that Escape dismisses', async ({
  page,
}) => {
  const errors = collectErrors(page);
  await page.setViewportSize({ width: 1024, height: 768 });
  await bootApp(page);
  await openBuilder(page);
  expect(await width(page, '.builder-library')).toBe(56);
  await expect(page.locator('.builder-inspector')).toBeHidden();
  await expect(page.locator('.builder-centre')).toHaveClass(/\bis-mode-plan\b/);
  // a class: the drawer is the only wa-drawer, but its role (dialog) and name ("Inspector") exist only while open
  const drawer = page.locator('wa-drawer.inspector-drawer');
  await page.getByRole('button', { name: 'Inspector', exact: true }).click();
  await expect(drawer).toHaveAttribute('open', '');
  // the open host covers the window out of the grid flow, so it is visible and the grid keeps its two rows
  await expect(drawer).toBeVisible();
  const rows = await page.locator('section.builder').evaluate((host) => getComputedStyle(host).gridTemplateRows);
  expect(rows.split(' ')).toHaveLength(2);
  await expect(drawer.getByRole('tab', { name: 'Trusses' })).toBeVisible();
  // Escape asks the drawer to close (`wa-hide`). The close itself is not awaited: Web Awesome ends its hide animation
  // on a requestAnimationFrame, and under `?test` the page's animation frames do not run, so `open` would never go.
  // The handle resolves once the listener is attached, so the Escape below cannot go by before it.
  const hide = await drawer.evaluateHandle((el) => ({
    fired: new Promise<string>((resolve) => el.addEventListener('wa-hide', (e) => resolve(e.type), { once: true })),
  }));
  await page.keyboard.press('Escape');
  expect([await hide.evaluate((h) => h.fired), errors]).toEqual(['wa-hide', []]);
});

// Bug: at 768 px the bar's items shrank to fit, so the mode group stacked its three buttons in a 76 px column and the
// 56 px bar showed only Split.
test('fits the bar in an iPad portrait window', async ({ page }) => {
  const errors = collectErrors(page);
  await page.setViewportSize({ width: 768, height: 1024 });
  await bootApp(page);
  await openBuilder(page);
  // a class: the bar is a <header> inside the builder, with no role or name
  const bar = page.locator('.builder-bar');
  const overflow = await bar.evaluate((el) => el.scrollWidth - el.clientWidth);
  const [, , barWidth, barHeight] = await boxOf(bar);
  const outside: string[] = [];
  for (const name of ['Plan', 'Split', '3D', 'Done']) {
    const [x, y, w, h] = await boxOf(page.getByRole('button', { name, exact: true }));
    if (x < 0 || y < 0 || x + w > barWidth || y + h > barHeight) outside.push(`${name}: ${x},${y} ${w}x${h}`);
  }
  const small = await bar
    .locator('wa-button:visible')
    .evaluateAll(
      (all) => all.map((b) => b.getBoundingClientRect()).filter((box) => box.width < 44 || box.height < 44).length,
    );
  expect([overflow, barWidth, outside, small, errors]).toEqual([0, 768, [], 0, []]);
});
