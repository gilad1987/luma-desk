import type { Page } from '@playwright/test';

/** Marks a fetch that failed with a network error, which a service worker gives when it cannot answer. */
export const NETWORK_ERROR = -1;

/** The status of a fetch made from inside the page, so it goes through the service worker; NETWORK_ERROR on failure. */
export function fetchStatus(page: Page, url: string, method = 'GET'): Promise<number> {
  return page.evaluate(
    async ({ url, method, failed }) => {
      try {
        const response = await fetch(url, { method });
        return response.status;
      } catch {
        return failed;
      }
    },
    { url, method, failed: NETWORK_ERROR },
  );
}
