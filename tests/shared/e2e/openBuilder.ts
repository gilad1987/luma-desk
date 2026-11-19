import { expect, type Page } from '@playwright/test';

/**
 * Opens the Stage Builder from the top bar on the Theatre template at the Sultan's Pool venue and waits until the
 * editing shell shows. The click loads the Web Awesome chunk first, so the start screen is awaited before a choice.
 */
export async function openBuilder(page: Page): Promise<void> {
  await page.locator('#buildBtn').click();
  await expect(page.locator('section.builder')).toBeVisible();
  await page.locator('[data-template="theatre"]').click();
  await page.locator('[data-venue="sultans-pool"]').click();
  await expect(page.locator('section.builder.is-editing')).toBeVisible();
}
