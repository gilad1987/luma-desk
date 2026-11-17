import type { Page } from '@playwright/test';
import type { DeskState, Layout, SavedShow } from './deskApi';

/** localStorage keys of the app; they are part of the saved-data contract and must not change. */
export const STORAGE_KEYS = { show: 'lumadesk-show-v6', layout: 'lumadesk-layout2', guideSeen: 'lumadesk-guide-seen' };

export interface BootOptions {
  /** A saved show to put in localStorage before the app boots. */
  show?: SavedShow;
  /** The console layout to boot in, as the layout select would save it. */
  layout?: Layout;
}

/**
 * Opens the app in test mode (frozen clock, seeded random, manual frames). The guide is marked as seen, because
 * on a first visit it covers the screen.
 */
export async function bootApp(page: Page, opts: BootOptions = {}): Promise<void> {
  const show = opts.show ? JSON.stringify(opts.show) : null;
  const layout = opts.layout ? JSON.stringify({ deskMode: opts.layout, deskZoom: 'auto' }) : null;
  await page.addInitScript(
    ({ keys, show, layout }) => {
      localStorage.setItem(keys.guideSeen, '1');
      if (show) localStorage.setItem(keys.show, show);
      if (layout) localStorage.setItem(keys.layout, layout);
    },
    { keys: STORAGE_KEYS, show, layout },
  );
  await page.goto('./?test');
  await waitForTestApi(page);
}

/** Polls on a timer: the default 'raf' polling would never fire, because test mode runs frames only on request. */
export const POLL = { polling: 100 } as const;

/** Waits until the module script has run, then draws the first frame. */
export async function waitForTestApi(page: Page): Promise<void> {
  await page.waitForFunction(() => !!window.__desk?.test, undefined, POLL);
  await page.evaluate(() => window.__desk.test.frames(1));
}

/** Moves the frozen clock forward `ms`, then draws one frame, `n` times. */
export async function step(page: Page, ms = 100, n = 1): Promise<void> {
  for (let i = 0; i < n; i++) {
    await page.evaluate((ms) => {
      window.__desk.test.advance(ms);
      return window.__desk.test.frames(1);
    }, ms);
  }
}

export const deskState = (page: Page): Promise<DeskState> => page.evaluate(() => window.__desk.test.state());

/** Collects console errors and uncaught page errors from the moment it is called. */
export function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`console: ${m.text()}`);
  });
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  return errors;
}
