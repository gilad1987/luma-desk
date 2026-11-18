/** The worker file the build writes at the dist root (build/sw-manifest-plugin.ts); its folder is its scope. */
const WORKER_URL = 'sw.js';

/**
 * Registers the offline service worker. Skipped on `file:` pages, where browsers refuse workers. A failed
 * registration is ignored: the desk works online without it, and the page has no update or reload logic.
 */
export function registerServiceWorker(): void {
  // quirk I10 (orig:2916)
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    navigator.serviceWorker.register(WORKER_URL).catch(() => {});
  }
}
