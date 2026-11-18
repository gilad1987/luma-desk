import { expect, test, type Page } from '@playwright/test';
import { STORAGE_KEYS, TIMER_POLLING, type SavedShow } from '../shared';
import { bootApp, collectErrors, waitForTestApi } from '../shared/e2e';

/** Waits for the delayed save (a real 500 ms timer) to store a show that has, or has not, a `stage` key. */
async function waitForStoredStage(page: Page, hasStage: boolean): Promise<void> {
  await page.waitForFunction(
    ({ key, hasStage }) => {
      const text = localStorage.getItem(key);
      return text !== null && 'stage' in (JSON.parse(text) as object) === hasStage;
    },
    { key: STORAGE_KEYS.show, hasStage },
    TIMER_POLLING,
  );
}

/** Waits for the delayed save to store a show with a stage and `cues` cues on executor `exec` (1-based). */
async function waitForStoredCues(page: Page, exec: number, cues: number): Promise<void> {
  await page.waitForFunction(
    ({ key, exec, cues }) => {
      const show = JSON.parse(localStorage.getItem(key) ?? '{}') as Partial<SavedShow> & { stage?: unknown };
      return show.stage !== undefined && show.execs?.[exec - 1]?.cues.length === cues;
    },
    { key: STORAGE_KEYS.show, exec, cues },
    TIMER_POLLING,
  );
}

test('the default stage saves no stage key', async ({ page }) => {
  const desk = await bootApp(page);
  await waitForStoredStage(page, false);
  expect(await desk.evaluate((d) => 'stage' in d.serialize())).toBe(false);
  expect(await page.evaluate(() => window.__desk.stage().count)).toBe(405);
});

test('a custom stage survives a reload', async ({ page }) => {
  const errors = collectErrors(page);
  await bootApp(page);
  await page.evaluate(() => window.__desk.applyTemplate('theatre'));
  const before = await page.evaluate(() => window.__desk.stage());
  expect(before.count).toBe(30);
  await waitForStoredStage(page, true);

  await page.reload();
  const desk = await waitForTestApi(page);
  expect(await page.evaluate(() => window.__desk.stage())).toEqual(before);
  expect(await page.evaluate(() => window.__desk.fixtures.length)).toBe(30);
  // the output follows the saved stage: one row per fixture of the new rig
  expect(await desk.evaluate((d) => d.outputAt(1).length)).toBe(30);
  expect(errors).toEqual([]);
});

test('GO+ plays a stored theatre cue after a reload', async ({ page }) => {
  const errors = collectErrors(page);
  const desk = await bootApp(page);
  await page.evaluate(() => window.__desk.applyTemplate('theatre'));
  // the demo fills every executor: store on the shortest stack, so the new cue is the last one GO+ reaches
  const { id, exec, cues } = await desk.evaluate((d) => {
    const id = window.__desk.fixtures[0]?.id ?? 0;
    const lengths = d.state().execs.map((e) => e.cues.length);
    const exec = lengths.indexOf(Math.min(...lengths)) + 1;
    d.run(`Fixture ${id} At 100`);
    d.run(`Store Exec ${exec}`);
    return { id, exec, cues: (lengths[exec - 1] ?? 0) + 1 };
  });
  await waitForStoredCues(page, exec, cues);

  await page.reload();
  const reloaded = await waitForTestApi(page);
  const dim = await reloaded.evaluate(
    (d, { id, exec, cues }) => {
      for (let go = 0; go < cues; go++) d.run(`Go+ Exec ${exec}`);
      return d.outputAt(60).find((o) => o.id === id)?.['dim'];
    },
    { id, exec, cues },
  );
  expect(dim).toBe(100);
  expect(errors).toEqual([]);
});
