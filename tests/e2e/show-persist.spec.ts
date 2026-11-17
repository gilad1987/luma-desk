import { expect, test } from '@playwright/test';
import { POLL, STORAGE_KEYS, bootApp, deskState, waitForTestApi, type SavedShow } from '../shared';

test('a stored cue survives a reload', async ({ page }) => {
  await bootApp(page);
  for (const line of ['Fixture 201 Thru 230 At Full', 'Store Cue 5 Fade 3 Exec 2']) {
    await page.locator('#cmd').fill(line);
    await page.locator('#cmd').press('Enter');
  }
  const before = (await deskState(page)).execs[1];
  expect(before?.cues).toContainEqual([5, 'Cue 5', 3]);
  // the app saves 500 ms after a change (real timer, not the test clock)
  await page.waitForFunction(
    (key) => {
      const show = JSON.parse(localStorage.getItem(key) ?? '{"execs":[]}') as SavedShow;
      return show.execs[1]?.cues.some((c) => c.num === 5) ?? false;
    },
    STORAGE_KEYS.show,
    POLL,
  );

  await page.reload();
  await waitForTestApi(page);
  const after = (await deskState(page)).execs[1];
  expect([after?.name, after?.cues]).toEqual([before?.name, before?.cues]);
  const vals = await page.evaluate(() => window.__desk.test.serialize().execs[1]?.cues.find((c) => c.num === 5)?.vals);
  expect(Object.keys(vals ?? {}).map(Number)).toEqual(Array.from({ length: 30 }, (_, i) => 201 + i));
});
