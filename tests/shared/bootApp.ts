import type { JSHandle, Page } from '@playwright/test';
import type { DeskTestApi, Layout } from './deskApi';
import type { SavedShow } from './savedShow';
import { STORAGE_KEYS } from './storageKeys';
import { waitForTestApi } from './waitForTestApi';

/** What localStorage holds before the app boots; anything not given is absent, as in a fresh browser. */
export interface BootOptions {
  /** A saved show, or raw text stored as is: old files byte for byte, or damaged data. */
  show?: SavedShow | string;
  /** The console layout to boot in, as the layout select would save it. */
  layout?: Layout;
  /** Keep the guide unseen, as on a first visit. By default it is marked seen, because it covers the screen. */
  firstVisit?: boolean;
}

/**
 * Opens the app in test mode (frozen clock, seeded random, manual frames) on the storage the options describe. The
 * storage is written by an init script, so it is in place before the app reads it, and again on every reload.
 */
export async function bootApp(page: Page, opts: BootOptions = {}): Promise<JSHandle<DeskTestApi>> {
  const show = typeof opts.show === 'string' ? opts.show : opts.show ? JSON.stringify(opts.show) : null;
  const layout = opts.layout ? JSON.stringify({ deskMode: opts.layout, deskZoom: 'auto' }) : null;
  await page.addInitScript(
    ({ keys, show, layout, guideSeen }) => {
      if (guideSeen) localStorage.setItem(keys.guideSeen, '1');
      if (show !== null) localStorage.setItem(keys.show, show);
      if (layout !== null) localStorage.setItem(keys.layout, layout);
    },
    { keys: STORAGE_KEYS, show, layout, guideSeen: !opts.firstVisit },
  );
  await page.goto('./?test');
  return waitForTestApi(page);
}
