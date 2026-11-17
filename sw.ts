/// <reference lib="webworker" />
/**
 * LUMA DESK service worker: the app shell offline, network-first for pages so a deploy shows up at once, and
 * stale-while-revalidate for everything else (ADR 0003). The logic is the hand-written sw.js unchanged, odd parts
 * included (docs/known-quirks.md, section I); only the file list and the cache name come from the build.
 */
export {};

declare const self: ServiceWorkerGlobalScope;

/** Every file the app needs offline; build/sw-manifest-plugin.ts writes it in at build time. */
declare const __SW_SHELL__: readonly string[];
/** `luma-desk-` + a hash of the shipped files, so a new cache starts exactly when a deploy changes a file. */
declare const __SW_CACHE__: string;

const CACHE = __SW_CACHE__;
const SHELL = __SW_SHELL__;

/** The cached page every navigation falls back to offline (quirk I2: any page response is stored under it). */
const PAGE = './index.html';

/**
 * Quirk I5: offline with nothing cached the promise resolves to undefined, and respondWith turns that into a network
 * error, as the old worker did. The cast states that on purpose instead of changing the outcome.
 */
const orNetworkError = (response: Promise<Response | undefined>): Promise<Response> => response as Promise<Response>;

/** Pages: network first, so updates show up immediately; the stored page when offline. */
function networkFirstPage(request: Request): Promise<Response> {
  const page = fetch(request).then((response) => {
    const copy = response.clone();
    // quirk I3: the write is not awaited
    void caches.open(CACHE).then((cache) => cache.put(PAGE, copy));
    return response;
  });
  return orNetworkError(page.catch(() => caches.match(PAGE)));
}

/** Everything else: the cached copy at once (query string ignored, quirk I4), refreshed from the network. */
function staleWhileRevalidate(request: Request): Promise<Response> {
  const response = caches.open(CACHE).then(async (cache) => {
    const hit = await cache.match(request, { ignoreSearch: true });
    const net = fetch(request)
      .then((fresh) => {
        // quirk I6: opaque cross-origin responses (Google Fonts) are cached too; quirk I3: not awaited
        if (fresh.ok || fresh.type === 'opaque') void cache.put(request, fresh.clone());
        return fresh;
      })
      .catch(() => hit);
    return hit ?? net;
  });
  return orNetworkError(response);
}

// quirk I9: one failed file fails the whole install; quirk I8: the new worker takes over at once
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting()),
  );
});

// quirk I7: deletes every other cache on the origin, not only old LUMA DESK ones
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    event.request.mode === 'navigate' ? networkFirstPage(event.request) : staleWhileRevalidate(event.request),
  );
});
