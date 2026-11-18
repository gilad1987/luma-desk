/**
 * A venue switch rebuilds the venue around the stage and frees the old one. The renderer's live GPU counts prove it:
 * each venue has the same counts every time it comes back, and the built-in stage brings back the boot counts.
 */
import { expect, test, type JSHandle, type Page } from '@playwright/test';
import type { DeskTestApi } from '../shared';
import { bootApp, collectErrors } from '../shared/e2e';

type RenderMemory = { geometries: number; textures: number };

/** Applies a template, runs a few frames (the renderer uploads on draw), then reads the venue and the live counts. */
async function applyAndMeasure(page: Page, desk: JSHandle<DeskTestApi>, id: string) {
  await page.evaluate((template) => window.__desk.applyTemplate(template), id);
  await desk.evaluate((d) => d.frames(3));
  const memory: RenderMemory = await page.evaluate(() => window.__desk.renderMemory());
  return { venue: await page.evaluate(() => window.__desk.stage().venue), memory };
}

test('three venue switches keep the GPU counts per venue, and the built-in stage restores the boot counts', async ({
  page,
}) => {
  const errors = collectErrors(page);
  const desk = await bootApp(page);
  const boot = await applyAndMeasure(page, desk, 'built-in');
  expect(boot.venue).toBe('sultans-pool');
  const blackBox = await applyAndMeasure(page, desk, 'empty');
  expect(blackBox.venue).toBe('black-box');
  const openField = await applyAndMeasure(page, desk, 'festival');
  expect(openField.venue).toBe('open-field');
  expect(await applyAndMeasure(page, desk, 'empty')).toEqual(blackBox);
  expect(await applyAndMeasure(page, desk, 'festival')).toEqual(openField);
  expect(await applyAndMeasure(page, desk, 'built-in')).toEqual(boot);
  expect(errors).toEqual([]);
});
