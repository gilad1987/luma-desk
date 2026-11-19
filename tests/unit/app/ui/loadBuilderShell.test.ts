// @vitest-environment jsdom
/**
 * Owns the CSS retry of the builder chunk load: the CSS URL read from Vite's preload error, the stylesheet link put in
 * again, and a load after a failed one that asks for the CSS again. That the real chunk loads is owned by e2e.
 * jsdom, because the links are real elements; jsdom fetches no stylesheet, so the tests dispatch `load` and `error`.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cssUrlOf, loadWithCssRetry, relinkStylesheet } from '../../../../src/app/ui/loadBuilderShell';

const CSS = 'http://localhost/assets/registerWa-abc.css';

/** The stylesheet links in `<head>` for {@link CSS}. */
const cssLinks = (): HTMLLinkElement[] =>
  Array.from(document.head.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]')).filter((l) => l.href === CSS);

/** Adds the link Vite leaves in `<head>` after a failed CSS preload. */
function viteLink(): HTMLLinkElement {
  const link = document.head.appendChild(document.createElement('link'));
  link.rel = 'stylesheet';
  link.href = CSS;
  return link;
}

describe('loadBuilderShell CSS retry', () => {
  afterEach(() => document.head.replaceChildren());

  // catches a parse that misses Vite's CSS failure (no retry) or takes a JS failure for a CSS one
  it('reads the URL of a Vite CSS preload error and nothing from other errors', () => {
    const vite = new Error(`Unable to preload CSS for ${CSS}`);
    expect([cssUrlOf(vite), cssUrlOf(new Error('Failed to fetch')), cssUrlOf('text')]).toEqual([CSS, null, null]);
  });

  // catches a re-link that keeps the dead link or never settles
  it('replaces the old link with a new one, resolving on load and rejecting on error', async () => {
    const old = viteLink();
    const loaded = relinkStylesheet(document.head, CSS);
    const replaced = cssLinks();
    replaced[0]?.dispatchEvent(new Event('load'));
    await loaded;
    const failed = relinkStylesheet(document.head, CSS);
    cssLinks()[0]?.dispatchEvent(new Event('error'));
    await expect(failed).rejects.toThrow('Unable to load CSS');
    expect([replaced.length, replaced[0] === old, cssLinks().length]).toEqual([1, false, 1]);
  });

  // the bug: Vite keeps a failed CSS URL in `seen` and never asks for it again, so the retry opens the builder unstyled
  it('asks for the failed CSS again on the next load and forgets it once it loads', async () => {
    const events = new EventTarget();
    const failed = new Set<string>();
    const error = new Error(`Unable to preload CSS for ${CSS}`);
    let stale: HTMLLinkElement | null = null;
    const firstLoad = (): Promise<void> => {
      stale = viteLink();
      events.dispatchEvent(Object.assign(new Event('vite:preloadError', { cancelable: true }), { payload: error }));
      return Promise.reject(error);
    };
    await expect(loadWithCssRetry({ head: document.head, events, failed, load: firstLoad })).rejects.toBe(error);
    const recorded = [...failed];
    const load = vi.fn(() => Promise.resolve());
    const retry = loadWithCssRetry({ head: document.head, events, failed, load });
    const relinked = cssLinks();
    relinked[0]?.dispatchEvent(new Event('load'));
    await retry;
    const isNewLink = relinked.length === 1 && relinked[0] !== stale;
    expect([recorded, isNewLink, load.mock.calls.length, failed.size]).toEqual([[CSS], true, 1, 0]);
  });
});
