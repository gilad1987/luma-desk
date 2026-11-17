import { test } from '@playwright/test';
import { bootApp, expectGolden } from '../shared';

test('demo show serialize() matches the golden', async ({ page }) => {
  const desk = await bootApp(page);
  expectGolden('demo-show', await desk.evaluate((d) => d.serialize()));
});
