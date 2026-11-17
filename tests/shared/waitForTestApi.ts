import type { JSHandle, Page } from '@playwright/test';
import type { DeskTestApi } from './deskApi';
import { TIMER_POLLING } from './timerPolling';

/**
 * Waits until the module script has run and draws the first frame. It returns a handle to window.__desk.test, so
 * specs narrow the optional API here once instead of checking it in every page callback. A reload makes the handle
 * stale: call this again after it.
 */
export async function waitForTestApi(page: Page): Promise<JSHandle<DeskTestApi>> {
  await page.waitForFunction(() => !!window.__desk?.test, undefined, TIMER_POLLING);
  const desk = await page.evaluateHandle(() => {
    const api = window.__desk.test;
    if (!api) throw new Error('window.__desk.test is missing: open the app with ?test');
    return api;
  });
  await desk.evaluate((d) => d.frames(1));
  return desk;
}
