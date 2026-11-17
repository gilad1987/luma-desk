import { test } from '@playwright/test';
import { bootApp, expectGolden } from '../shared';

test('demo show serialize() matches the golden', async ({ page }) => {
  await bootApp(page);
  expectGolden('demo-show', await page.evaluate(() => window.__desk.test.serialize()));
});
