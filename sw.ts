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

/**
 * The cached page every navigation falls back to offline; any page response is stored under it
 * (quirk I2, orig:sw.js:18).
 */
const PAGE = './index.html';

/** Pages: network first, so updates show up immediately; the stored page when offline. */
function networkFirstPage(request: Request): Promise<Response> {
  const page = fetch(request).then((response) => {
    const copy = response.clone();
    // quirk I3 (orig:sw.js:18): the write is not awaited
    void caches.open(CACHE).then((cache) => cache.put(PAGE, copy));
    return response;
  });
  // quirk I5 (orig:sw.js:18): offline with no stored page this resolves to undefined, and respondWith turns that
  // into a network error, as the old worker did; the cast keeps that outcome on purpose
  return page.catch(() => caches.match(PAGE)) as Promise<Response>;
}

/** Everything else: the cached copy at once (query ignored, quirk I4, orig:sw.js:22), refreshed from the network. */
function staleWhileRevalidate(request: Request): Promise<Response> {
  const response = caches.open(CACHE).then(async (cache) => {
    const hit = await cache.match(request, { ignoreSearch: true });
    const net = fetch(request)
      .then((fresh) => {
        // quirk I6 (orig:sw.js:23): opaque cross-origin responses (Google Fonts) are cached too
        // quirk I3 (orig:sw.js:23): the write is not awaited
        if (fresh.ok || fresh.type === 'opaque') void cache.put(request, fresh.clone());
        return fresh;
      })
      .catch(() => hit);
    return hit ?? net;
  });
  // quirk I5 (orig:sw.js:23-24): undefined offline with nothing cached, which respondWith turns into a network error
  return response as Promise<Response>;
}

// quirk I9 (orig:sw.js:13): one failed file fails the whole install
// quirk I8 (orig:sw.js:13-14): the new worker takes over at once
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting()),
  );
});

// quirk I7 (orig:sw.js:14): deletes every other cache on the origin, not only old LUMA DESK ones
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
