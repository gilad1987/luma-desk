import { expect, test, type Page } from '@playwright/test';
import { STORAGE_KEYS, TIMER_POLLING } from '../shared';
import { SYNTHETIC_MVR, bootApp, clickInShowFile, collectErrors, deadFixtureIds as deadIds } from '../shared/e2e';
import { pickMvrFile, waitForTestApi } from '../shared/e2e';

type Desk = Awaited<ReturnType<typeof bootApp>>;

/** The cue numbers of executor `n` (1-based). */
const cueNums = async (desk: Desk, n: number): Promise<number[]> =>
  (await desk.evaluate((d) => d.state())).execs[n - 1]?.cues.map(([num]) => num) ?? [];

/** Stores a new cue 20 on executor 4 from the first fixture at 50 %: the show is no longer a starting show. */
async function changeShow(page: Page, desk: Desk): Promise<void> {
  const first = await page.evaluate(() => window.__desk.fixtures[0]?.id ?? 0);
  await desk.evaluate((d, id) => d.run(`Fixture ${id} At 50`), first);
  await desk.evaluate((d) => d.run('Store Cue 20 Exec 4'));
  expect(await cueNums(desk, 4)).toContain(20);
}

test('an import over the unchanged demo builds the starting show for the rig, first look on executor 1', async ({
  page,
}) => {
  const errors = collectErrors(page);
  const desk = await bootApp(page);
  await pickMvrFile(page, desk, SYNTHETIC_MVR);
  await expect(page.locator('#mvrSummary')).toBeVisible();
  await expect(page.locator('#mvrShowChoice')).toHaveCount(0);
  expect((await desk.evaluate((d) => d.state())).execs[0]?.cues).toEqual([[1, 'MVR First Look', 2]]);
  expect(await deadIds(desk)).toEqual([]);
  const rig = await page.evaluate(() => window.__desk.fixtures.map((f) => f.id));
  const out = await desk.evaluate((d) => d.outputAt(3));
  for (const id of rig) expect(out.find((o) => o.id === id)?.['dim'] ?? 0, `fixture ${id}`).toBeGreaterThan(0);
  for (const o of out) for (const [key, v] of Object.entries(o)) expect(Number.isNaN(v), `${o.id} ${key}`).toBe(false);
  expect(errors).toEqual([]);
});

test('an import over a changed show keeps the cues without dead ids; Escape keeps, Build replaces', async ({
  page,
}) => {
  const desk = await bootApp(page);
  await changeShow(page, desk);
  await pickMvrFile(page, desk, SYNTHETIC_MVR);
  await expect(page.locator('#mvrShowChoice')).toBeVisible();
  await expect(page.locator('#mvrBuildShow')).toBeFocused();
  expect(await cueNums(desk, 4)).toContain(20);
  expect(await deadIds(desk)).toEqual([]);
  await page.keyboard.press('Escape');
  await expect(page.locator('#mvrSummary')).toBeHidden();
  expect(await cueNums(desk, 4)).toContain(20);

  await pickMvrFile(page, desk, SYNTHETIC_MVR);
  await page.locator('#mvrKeepCues').click();
  await expect(page.locator('#mvrShowChoice')).toHaveCount(0);
  await expect(page.locator('#mvrSummaryClose')).toBeFocused();
  expect(await cueNums(desk, 4)).toContain(20);
  await page.locator('#mvrSummaryClose').click();

  await pickMvrFile(page, desk, SYNTHETIC_MVR);
  await page.locator('#mvrBuildShow').click();
  expect(await cueNums(desk, 4)).not.toContain(20);
  expect((await desk.evaluate((d) => d.state())).execs[0]?.name).toBe('MVR First Look');
  expect(await deadIds(desk)).toEqual([]);
});

test('a reload after an import rebuilds nothing and keeps no dead id', async ({ page }) => {
  const desk = await bootApp(page);
  await pickMvrFile(page, desk, SYNTHETIC_MVR);
  const execs = (await desk.evaluate((d) => d.serialize())).execs;
  // the show is saved 500 ms after a change on a real timer; the poll is synchronous on purpose
  const isSaved = (key: string): boolean => (localStorage.getItem(key) ?? '').includes('"name":"MVR First Look"');
  await page.waitForFunction(isSaved, STORAGE_KEYS.show, TIMER_POLLING);
  await page.reload();
  const again = await waitForTestApi(page);
  await again.evaluate((d) => d.mvrReady());
  expect((await again.evaluate((d) => d.serialize())).execs).toEqual(execs);
  expect(await deadIds(again)).toEqual([]);
});

test('Load demo rig after an import over the unchanged demo brings the built-in demo show back', async ({ page }) => {
  const desk = await bootApp(page);
  const boot = (await desk.evaluate((d) => d.serialize())).execs.map((e) => ({ name: e.name, cues: e.cues }));
  await pickMvrFile(page, desk, SYNTHETIC_MVR);
  await page.locator('#mvrSummaryClose').click();
  await clickInShowFile(page, 'fDemoRig');
  await expect.poll(async () => (await desk.evaluate((d) => d.state())).execs[0]?.name).toBe('Main Show');
  const after = (await desk.evaluate((d) => d.serialize())).execs.map((e) => ({ name: e.name, cues: e.cues }));
  expect(after).toEqual(boot);
  expect(await deadIds(desk)).toEqual([]);
});
