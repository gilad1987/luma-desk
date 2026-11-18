import { expect, test, type JSHandle, type Locator } from '@playwright/test';
import type { DeskTestApi } from '../shared';
import {
  SYNTHETIC_MVR,
  bootApp,
  clickInShowFile,
  collectErrors,
  pickMvrFile,
  readMvrStage,
  stepFrames,
} from '../shared/e2e';

/** The text of one Sheet cell, found by its column header so a new column does not shift the test. */
async function cellText(sheet: Locator, fixtureId: number, header: string): Promise<string> {
  const column = (await sheet.locator('th').allTextContents()).indexOf(header);
  expect(column, `Sheet column ${header}`).toBeGreaterThanOrEqual(0);
  return (await sheet.locator(`tr[data-id="${fixtureId}"] td`).nth(column).textContent()) ?? '';
}

/**
 * The fixture ids of the Sheet rows, in page order, after the slow UI tick: the Sheet repaints on that tick, so the
 * frozen clock moves past it first.
 */
async function rowIds(sheet: Locator, desk: JSHandle<DeskTestApi>): Promise<number[]> {
  await stepFrames(desk, 500, 2);
  return sheet.locator('tr[data-id]').evaluateAll((rows) => rows.map((tr) => Number(tr.getAttribute('data-id'))));
}

/** The ids of the stage's fixtures, in rig order, as the MVR test hook reports them. */
async function stageIds(desk: JSHandle<DeskTestApi>): Promise<number[]> {
  return (await readMvrStage(desk)).patches.map((p) => p.id);
}

// the boot rig also has fixtures 101 and 102, so the rows must match the stage exactly, not only hold those ids
test('the Sheet lists the rows of an imported MVR rig, with its DMX cells, and the boot rig again after Load demo rig', async ({
  page,
}) => {
  const errors = collectErrors(page);
  const desk = await bootApp(page, { layout: 'desk' });
  await page.locator('#sideTabs button[data-t="sheet"]').click();
  const sheet = page.locator('#sheet');
  const bootIds = await stageIds(desk);
  expect(await rowIds(sheet, desk)).toEqual(bootIds);
  await expect(sheet).toBeVisible();

  await pickMvrFile(page, desk, SYNTHETIC_MVR);
  await page.locator('#mvrSummaryClose').click();
  const imported = await stageIds(desk);
  expect(imported).toEqual([101, 102]);
  expect(await rowIds(sheet, desk)).toEqual(imported);
  expect(await cellText(sheet, 101, 'Universe.Address')).toBe('2.1');
  expect(await cellText(sheet, 101, 'Mode')).toBe('Std');
  expect(await cellText(sheet, 102, 'Universe.Address')).toBe('—');
  expect(await cellText(sheet, 102, 'Mode')).toBe('Std');

  await clickInShowFile(page, 'fDemoRig');
  await expect.poll(() => stageIds(desk)).toEqual(bootIds);
  expect(await rowIds(sheet, desk)).toEqual(bootIds);
  expect(errors).toEqual([]);
});
