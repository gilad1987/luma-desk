import { expect, test, type Page } from '@playwright/test';
import { bootApp, collectErrors, readDeskState } from '../shared/e2e';

/** Opens the builder from the top bar and picks a template, then the Sultan's Pool venue. */
async function openAndChoose(page: Page, template: string): Promise<void> {
  await page.locator('#buildBtn').click();
  await expect(page.locator('section.builder')).toBeVisible();
  await page.locator(`[data-template="${template}"]`).click();
  await page.locator('[data-venue="sultans-pool"]').click();
  await expect(page.locator('section.builder.is-editing')).toBeVisible();
}

const stageInfo = (page: Page) => page.evaluate(() => window.__desk.stage());

/** Adds one straight truss from the Trusses tab; it becomes the selected item in the property panel. */
async function addTruss(page: Page): Promise<void> {
  const tools = page.locator('.builder-tools');
  await tools.getByRole('tab', { name: 'Trusses' }).click();
  await tools.getByRole('tabpanel', { name: 'Trusses' }).getByRole('button', { name: 'Straight', exact: true }).click();
}

test('Build Stage, Theatre, Done: the desk drives the 30 theatre fixtures', async ({ page }) => {
  const errors = collectErrors(page);
  const desk = await bootApp(page);
  await openAndChoose(page, 'theatre');
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
  await openAndChoose(page, 'theatre');
  await page.locator('[data-builder="cancel"]').click();
  await expect(page.locator('section.builder')).toHaveCount(0);
  expect(await stageInfo(page)).toEqual(before);
  expect(await page.evaluate(() => window.__desk.fixtures.length)).toBe(before.count);
  expect(errors).toEqual([]);
});

test('an added truss, undone, leaves the chosen stage as Done keeps it', async ({ page }) => {
  const errors = collectErrors(page);
  await bootApp(page);
  await openAndChoose(page, 'theatre');
  const trusses = page.locator('.builder-tools .truss-item');
  await addTruss(page);
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
  await page.keyboard.press('Space');
  await page.locator('[data-builder="cancel"]').click();
  expect(await readDeskState(desk)).toEqual(before);
});

test('the property panel keeps the Tab order: X, then Tab, lands on Y', async ({ page }) => {
  // known defect, owned by F24 (src/ui/builder): after a change of X, Tab does not land on Y. Remove this line with the fix.
  test.fail();
  await bootApp(page);
  await openAndChoose(page, 'theatre');
  await addTruss(page);
  await page.locator('.builder-panel').getByLabel('X (m)').first().fill('2');
  await page.keyboard.press('Tab');
  const focusKey = () => page.evaluate(() => (document.activeElement as HTMLElement | null)?.dataset['focusKey']);
  await expect.poll(focusKey, { timeout: 3000 }).toBe('Y (m)');
});
