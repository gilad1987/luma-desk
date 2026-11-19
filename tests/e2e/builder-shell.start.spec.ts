/**
 * The Stage Builder start screen covers the columns, which are laid out under it: before a choice nothing under it is
 * reachable by Tab or by the narrow screen's Inspector button. The start cards themselves are owned by builder-flow,
 * the columns by builder-shell.layout.
 */
import { expect, test, type Page } from '@playwright/test';
import { bootApp, collectErrors } from '../shared/e2e';

// classes: the start cards are buttons whose names are Hebrew help texts; the columns have no role or name
const COVERED = '.builder-library, .builder-centre, .builder-inspector, wa-drawer';
const lastCard = (page: Page) => page.locator('.start-screen .start-card').last();

/** Where the focus is: `covered` under the start screen, `bar`, `start`, or the tag name of anything else. */
const focusPlace = (page: Page): Promise<string> =>
  page.evaluate((covered) => {
    const el = document.activeElement;
    if (el?.closest(covered)) return 'covered';
    if (el?.closest('.builder-bar')) return 'bar';
    return el?.closest('.start-screen') ? 'start' : (el?.tagName.toLowerCase() ?? 'none');
  }, COVERED);

async function openStart(page: Page): Promise<void> {
  await bootApp(page);
  await page.locator('#buildBtn').click();
  await expect(lastCard(page)).toBeVisible();
}

// Bug: Tab past the last start card moved into the covered inspector, whose fields edited the draft before a choice
test('Tab from the last start card stays in the bar and the start screen (1280 px)', async ({ page }) => {
  const errors = collectErrors(page);
  await page.setViewportSize({ width: 1280, height: 800 });
  await openStart(page);
  await lastCard(page).focus();
  const places: string[] = [];
  for (let i = 0; i < 10; i++) {
    await page.keyboard.press('Tab');
    places.push(await focusPlace(page));
  }
  expect([places.includes('covered'), places.includes('bar'), errors]).toEqual([false, true, []]);
});

// Bug: on a narrow screen the Inspector button opened the drawer with the full tools over the start screen
test('the Inspector button is hidden before a choice and opens the drawer after it (1024 px)', async ({ page }) => {
  const errors = collectErrors(page);
  await page.setViewportSize({ width: 1024, height: 768 });
  await openStart(page);
  // a class: the drawer's role (dialog) and name exist only while it is open
  const drawer = page.locator('wa-drawer.inspector-drawer');
  const inspector = page.getByRole('button', { name: 'Inspector', exact: true });
  await expect(inspector).toBeHidden();
  // a click at its place, past the visibility check, must not open the drawer either
  await page.getByRole('button', { name: 'Inspector', exact: true, includeHidden: true }).click({ force: true });
  await expect(drawer).not.toHaveAttribute('open');
  await page.locator('[data-template="theatre"]').click();
  await page.locator('[data-venue="sultans-pool"]').click();
  await inspector.click();
  await expect(drawer).toHaveAttribute('open', '');
  expect(errors).toEqual([]);
});
