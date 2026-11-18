import { expect, test, type Page } from '@playwright/test';
import { bootApp, collectErrors } from '../shared/e2e';

/** A good v1 show whose `stage` key does not parse: the desk loads it on the built-in stage. */
const BAD_STAGE_SHOW = JSON.stringify({
  v: 1,
  groups: {},
  presets: {},
  execs: [],
  bpm: 97,
  haze: 0,
  stage: { v: 1, trusses: 'x', fixtures: 5 },
});
const BAD_STAGE_TEXT = 'נתוני הבמה בקובץ ההופעה פגומים. נטענה במת ברירת המחדל.';

/** The two ways the Show File dialog imports: the pasted text box and the file input. */
const IMPORTS: Record<string, (page: Page) => Promise<void>> = {
  pasted: async (page) => {
    await page.locator('#fTxt').fill(BAD_STAGE_SHOW);
    await page.locator('#fImp').click();
  },
  file: (page) =>
    page
      .locator('#fFile')
      .setInputFiles({ name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from(BAD_STAGE_SHOW) }),
};

for (const [way, load] of Object.entries(IMPORTS)) {
  test(`an imported show with a bad stage shows the bad-stage toast, not "Show loaded": ${way}`, async ({ page }) => {
    const errors = collectErrors(page);
    const desk = await bootApp(page);
    const builtIn = await page.evaluate(() => window.__desk.stage());
    await page.locator('#fileBtn').click();
    await load(page);
    await expect(page.locator('#toast')).toHaveText(BAD_STAGE_TEXT);
    expect(await desk.evaluate((d) => d.serialize().bpm)).toBe(97);
    expect(await page.evaluate(() => window.__desk.stage())).toEqual(builtIn);
    expect(errors).toEqual([]);
  });
}
