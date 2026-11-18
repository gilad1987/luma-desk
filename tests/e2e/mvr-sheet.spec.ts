import { expect, test, type Locator } from '@playwright/test';
import { SYNTHETIC_MVR, bootApp, collectErrors, pickMvrFile, stepFrames } from '../shared/e2e';

/** The text of one Sheet cell, found by its column header so a new column does not shift the test. */
async function cellText(sheet: Locator, fixtureId: number, header: string): Promise<string> {
  const column = (await sheet.locator('th').allTextContents()).indexOf(header);
  expect(column, `Sheet column ${header}`).toBeGreaterThanOrEqual(0);
  return (await sheet.locator(`tr[data-id="${fixtureId}"] td`).nth(column).textContent()) ?? '';
}

test('the Sheet shows the Universe.Address and Mode of an imported MVR design', async ({ page }) => {
  const errors = collectErrors(page);
  const desk = await bootApp(page, { layout: 'desk' });
  await pickMvrFile(page, desk, SYNTHETIC_MVR);
  await page.locator('#mvrSummaryClose').click();

  await page.locator('#sideTabs button[data-t="sheet"]').click();
  // the Sheet repaints on the slow UI tick, so move the frozen clock past it
  await stepFrames(desk, 500, 2);
  const sheet = page.locator('#sheet');
  await expect(sheet).toBeVisible();
  expect(await cellText(sheet, 101, 'Universe.Address')).toBe('2.1');
  expect(await cellText(sheet, 101, 'Mode')).toBe('Std');
  expect(await cellText(sheet, 102, 'Universe.Address')).toBe('—');
  expect(await cellText(sheet, 102, 'Mode')).toBe('Std');
  expect(errors).toEqual([]);
});
