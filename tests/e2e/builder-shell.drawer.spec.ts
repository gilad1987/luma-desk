/**
 * The narrow screen's inspector drawer against the builder bar: while it is open the bar stays visible and usable, the
 * drawer starts at the bar's bottom edge, and the Inspector button tells its open state. The columns and the move of
 * the tools are owned by builder-shell.layout.
 */
import { expect, test, type Page } from '@playwright/test';
import { bootApp, boxOf, collectErrors, openBuilder } from '../shared/e2e';

/** The bar's Inspector button (the role query reaches the inner `<button>` of the `wa-button`). */
const inspectorButton = (page: Page) => page.getByRole('button', { name: 'Inspector', exact: true });

/**
 * The open state the Inspector button's `wa-button` host carries, which the builder copies to the inner `<button>`;
 * that the accessibility tree shows it there is owned by builder-shell.aria.
 */
const expandedState = (page: Page) => page.locator('[data-builder="inspector"]').getAttribute('aria-expanded');

/** Opens the builder at 1024 px and the inspector from the bar. */
async function openInspector(page: Page): Promise<void> {
  await page.setViewportSize({ width: 1024, height: 768 });
  await bootApp(page);
  await openBuilder(page);
  await inspectorButton(page).click();
  await expect(page.getByRole('complementary', { name: 'Inspector' })).toBeVisible();
}

// Bug: below 1100 px the open drawer was a modal dialog over the whole window: it covered Cancel and Done and made
// the bar inert
test('narrow (1024 px): the open inspector leaves the bar usable and starts under it', async ({ page }) => {
  const errors = collectErrors(page);
  await openInspector(page);
  expect(await expandedState(page)).toBe('true');
  const done = page.getByRole('button', { name: 'Done', exact: true });
  await expect(done).toBeVisible();
  const doneOnTop = await done.evaluate((el) => {
    const box = el.getBoundingClientRect();
    const hit = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2);
    // the role query gives the inner <button>; the page-level hit is retargeted to its wa-button host
    const root = el.getRootNode();
    const host = root instanceof ShadowRoot ? root.host : el;
    return hit !== null && (host === hit || host.contains(hit));
  });
  const [, drawerTop] = await boxOf(page.getByRole('complementary', { name: 'Inspector' }));
  expect([doneOnTop, Math.abs(drawerTop - 56) <= 1]).toEqual([true, true]);
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(page.locator('section.builder')).toHaveCount(0);
  expect(errors).toEqual([]);
});

// Bug: the Inspector button did not tell whether the drawer it opens is open
test('narrow (1024 px): Escape closes the inspector and gives the focus back to the button', async ({ page }) => {
  const errors = collectErrors(page);
  await openInspector(page);
  const drawer = page.getByRole('complementary', { name: 'Inspector' });
  // the focus moved into the drawer on open, so Escape is pressed where a keyboard user is
  const focusInside = await page.evaluate(() => document.activeElement?.closest('#builder-inspector-drawer') !== null);
  await page.keyboard.press('Escape');
  await expect(drawer).toBeHidden();
  await expect(inspectorButton(page)).toBeFocused();
  expect([focusInside, await expandedState(page), errors]).toEqual([true, 'false', []]);
});
