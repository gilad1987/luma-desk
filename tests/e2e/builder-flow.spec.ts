/**
 * The Stage Builder flow from the desk: open, choose, edit, then Done or Cancel, and the desk keys while it is open.
 * The shell layout (columns, divider, modes, drawer, network) is owned by builder-shell.*, the desk around the open
 * builder by builder-desk.
 */
import { expect, test, type Page } from '@playwright/test';
import { bootApp, collectErrors, openBuilder, readDeskState } from '../shared/e2e';

const stageInfo = (page: Page) => page.evaluate(() => window.__desk.stage());

/** Adds one straight truss from the Trusses tab; it becomes the selected item in the property panel. */
async function addTruss(page: Page): Promise<void> {
  // a class: the inspector column is one of three unnamed <aside> elements (with #side and .builder-library), so no
  // role fits
  const tools = page.locator('.builder-inspector');
  await tools.getByRole('tab', { name: 'Trusses' }).click();
  await tools.getByRole('tabpanel', { name: 'Trusses' }).getByRole('button', { name: 'Straight', exact: true }).click();
}

test('Build Stage, Theatre, Done: the desk drives the 30 theatre fixtures', async ({ page }) => {
  const errors = collectErrors(page);
  const desk = await bootApp(page);
  await openBuilder(page);
  await page.locator('[data-builder="done"]').click();
  await expect(page.locator('section.builder')).toHaveCount(0);
  expect(await page.evaluate(() => window.__desk.fixtures.length)).toBe(30);
  const id = await page.evaluate(() => window.__desk.fixtures[0]?.id ?? -1);
  await desk.evaluate((d, fixture) => d.run(`Fixture ${fixture} At 100`), id);
  const out = await desk.evaluate((d, fixture) => d.outputAt(1).find((f) => f.id === fixture), id);
  expect(out?.['dim']).toBeGreaterThan(0);
  expect(errors).toEqual([]);
});

test('Build Stage, Theatre, Cancel: the stage is unchanged', async ({ page }) => {
  const errors = collectErrors(page);
  await bootApp(page);
  const before = await stageInfo(page);
  await openBuilder(page);
  await page.locator('[data-builder="cancel"]').click();
  await expect(page.locator('section.builder')).toHaveCount(0);
  expect(await stageInfo(page)).toEqual(before);
  expect(await page.evaluate(() => window.__desk.fixtures.length)).toBe(before.count);
  expect(errors).toEqual([]);
});

test('an added truss, undone, leaves the chosen stage as Done keeps it', async ({ page }) => {
  const errors = collectErrors(page);
  await bootApp(page);
  await openBuilder(page);
  // a class: each truss row is a button named by its truss, beside the add buttons, so only the class counts the rows
  const trusses = page.locator('.builder-inspector .truss-item');
  await addTruss(page);
  // the panels render on the next task after an edit: the new truss in the property panel shows that render is done;
  // a class, because the property panel is a plain <div> with no role or id
  await expect(page.locator('.prop-panel').getByLabel('X (m)')).toBeVisible();
  const added = await trusses.count();
  await page.locator('[data-edit="undo"]').click();
  await expect(trusses).toHaveCount(added - 1);
  await page.locator('[data-builder="done"]').click();
  // `source` names the last apply (the preview, then Done), not the design, so the check leaves it out
  const { count, venue } = await stageInfo(page);
  expect({ count, venue }).toEqual({ count: 30, venue: 'sultans-pool' });
  expect(errors).toEqual([]);
});

test('while the builder is open, Space (GO+) does nothing to the desk', async ({ page }) => {
  const desk = await bootApp(page);
  const before = await readDeskState(desk);
  await page.locator('#buildBtn').click();
  // the click loads the shell chunk first; a Space before the builder shows would reach the desk by right
  await expect(page.locator('section.builder')).toBeVisible();
  await page.keyboard.press('Space');
  await page.locator('[data-builder="cancel"]').click();
  expect(await readDeskState(desk)).toEqual(before);
});

test('the property panel keeps the Tab order: X, then Tab, lands on Y', async ({ page }) => {
  await bootApp(page);
  await openBuilder(page);
  await addTruss(page);
  // a class: the builder panel (tabs and property panel) is a plain <div> with no role or id
  await page.locator('.builder-panel').getByLabel('X (m)').first().fill('2');
  await page.keyboard.press('Tab');
  const focusKey = () => page.evaluate(() => (document.activeElement as HTMLElement | null)?.dataset['focusKey']);
  await expect.poll(focusKey, { timeout: 3000 }).toBe('Y (m)');
});
