import type { Page } from '@playwright/test';

/** Marks that no page is stored, so a test can poll until one is. */
export const NO_STORED_PAGE = 'no stored page';

/** The page the service worker answers every navigation with when offline (quirk I2: it is stored as ./index.html). */
export async function storedPage(page: Page): Promise<string> {
  return page.evaluate(async (none) => {
    const response = await caches.match('./index.html');
    return response ? response.text() : none;
  }, NO_STORED_PAGE);
}
