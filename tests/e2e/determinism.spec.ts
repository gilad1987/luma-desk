import { test } from '@playwright/test';
import { bootApp, expectGolden } from '../shared';

// A diagnostic, not a behavior check: three.js generateUUID() draws from the seeded Math.random, so the order in
// which the refactored code creates objects shifts every later random number. When the screenshots change, a changed
// count here says the cause is creation order, not drawing.
test('boot uses a fixed number of Math.random calls', async ({ page }) => {
  const desk = await bootApp(page);
  expectGolden('random-calls', {
    afterBoot: await desk.evaluate((d) => d.randomCalls()),
  });
});
