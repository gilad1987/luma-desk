import { expect, test, type Page } from '@playwright/test';
import { bootApp, collectErrors, readDeskState } from '../shared/e2e';

/** Every fixture id the selection or a group names that the current rig does not have. */
function strayIds(page: Page): Promise<number[]> {
  return page.evaluate(() => {
    const desk = window.__desk;
    const known = new Set(desk.fixtures.map((f) => f.id));
    const state = desk.test?.state();
    const named = [...(state?.sel ?? []), ...Object.values(state?.groups ?? {}).flatMap((g) => g.ids)];
    return named.filter((id) => !known.has(id));
  });
}

test('a template, then the built-in stage again, keeps the selection and the groups consistent', async ({ page }) => {
  const errors = collectErrors(page);
  const desk = await bootApp(page);
  await desk.evaluate((d) => d.run('Fixture 201 Thru 230'));
  const before = await readDeskState(desk);
  expect(before.sel).toHaveLength(30);

  await page.evaluate(() => window.__desk.applyTemplate('theatre'));
  expect(await page.evaluate(() => window.__desk.stage().count)).toBe(30);
  expect(await strayIds(page)).toEqual([]);

  await page.evaluate(() => window.__desk.applyTemplate('built-in'));
  expect(await page.evaluate(() => window.__desk.stage().count)).toBe(405);
  expect(await strayIds(page)).toEqual([]);
  const after = await readDeskState(desk);
  // the built-in stage's default groups come back in their own slots; the user groups were never touched
  expect(after.groups).toEqual(before.groups);
  expect(errors).toEqual([]);
});
