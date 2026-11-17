import { expect, test, type JSHandle, type Page } from '@playwright/test';
import { STORAGE_KEYS, jsonRoundTrip, type DeskTestApi } from '../shared';
import { bootApp, readDeskState, readStoredJson } from '../shared/e2e';

/** Waits for the save the app makes 500 ms (real timer) after the demo loads, then checks it holds the demo. */
async function expectDemoSaved(page: Page, desk: JSHandle<DeskTestApi>): Promise<void> {
  const demo = jsonRoundTrip(await desk.evaluate((d) => d.serialize()));
  await expect.poll(() => readStoredJson(page, STORAGE_KEYS.show), { intervals: [100] }).toStrictEqual(demo);
}

test('first visit: the guide opens and the demo show loads and is saved', async ({ page }) => {
  const desk = await bootApp(page, { firstVisit: true });
  await expect(page.locator('#guide')).toHaveClass(/\bshow\b/);
  expect((await readDeskState(desk)).execs[0]?.name).toBe('Main Show');
  await expectDemoSaved(page, desk);
});

// Kept quirk: a damaged saved show is not reported; the app loads the demo and its next save overwrites the damage.
test('a damaged saved show falls back to the demo and is overwritten', async ({ page }) => {
  const desk = await bootApp(page, { show: '{"v":1,"groups":' });
  expect((await readDeskState(desk)).execs[0]?.name).toBe('Main Show');
  await expectDemoSaved(page, desk);
});
