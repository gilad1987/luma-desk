import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { bootApp, collectErrors } from '../shared/e2e';

// The shows of old-show.spec.ts, saved by older apps before the stage existed: they mean the built-in stage.
const SAVED_SHOWS = ['old-show-v1.json', 'old-show-38efd21.json'];

for (const file of SAVED_SHOWS) {
  test(`a show saved before the stage existed loads on the built-in stage: ${file}`, async ({ page }) => {
    const raw = readFileSync(join(import.meta.dirname, '..', 'fixtures', file), 'utf8');
    const errors = collectErrors(page);
    const fresh = await bootApp(page);
    const builtIn = await page.evaluate(() => window.__desk.stage());
    expect(builtIn.count).toBe(405);
    expect(await fresh.evaluate((d) => 'stage' in d.serialize())).toBe(false);

    const desk = await bootApp(page, { show: raw });
    expect(await page.evaluate(() => window.__desk.stage())).toEqual(builtIn);
    // saving the old show again writes no stage key, so it stays a file older desks can read
    expect(await desk.evaluate((d) => 'stage' in d.serialize())).toBe(false);
    expect(errors).toEqual([]);
  });
}
