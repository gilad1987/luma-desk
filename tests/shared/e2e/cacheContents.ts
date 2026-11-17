import type { Page } from '@playwright/test';

/** The cache names on the origin and the URLs each one holds, read from inside the page. */
export function cacheContents(page: Page): Promise<Record<string, string[]>> {
  return page.evaluate(async () => {
    const names = await caches.keys();
    const entries = await Promise.all(
      names.map(async (name) => {
        const requests = await (await caches.open(name)).keys();
        return [name, requests.map((request) => request.url)] as const;
      }),
    );
    return Object.fromEntries(entries);
  });
}
