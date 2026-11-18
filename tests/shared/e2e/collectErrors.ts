import type { Page } from '@playwright/test';

/**
 * Collects console errors and uncaught page errors from the moment it is called. The app catches many errors
 * itself, so a spec that only checks the screen would miss a refactor that starts to throw.
 */
export function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`console: ${m.text()}`);
  });
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  return errors;
}
