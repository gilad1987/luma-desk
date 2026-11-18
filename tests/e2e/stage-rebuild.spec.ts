/**
 * A stage change rebuilds the 3D stage and frees what the old stage owned. The renderer's live GPU counts prove both:
 * the festival stage changes them (the scene was rebuilt), a second festival apply keeps them (nothing leaked), and
 * the built-in stage brings back the boot counts.
 */
import { expect, test, type JSHandle, type Page } from '@playwright/test';
import type { DeskTestApi } from '../shared';
import { bootApp, collectErrors } from '../shared/e2e';

type RenderMemory = { geometries: number; textures: number };

/** Runs a few frames (the renderer uploads on draw; test mode draws only on request), then reads the live counts. */
async function measure(page: Page, desk: JSHandle<DeskTestApi>): Promise<RenderMemory> {
  await desk.evaluate((d) => d.frames(3));
  return page.evaluate(() => window.__desk.renderMemory());
}

async function applyAndMeasure(page: Page, desk: JSHandle<DeskTestApi>, id: string): Promise<RenderMemory> {
  await page.evaluate((template) => window.__desk.applyTemplate(template), id);
  return measure(page, desk);
}

test('the festival stage changes the GPU counts without a leak, and the built-in stage restores the boot counts', async ({
  page,
}) => {
  // full stage rebuilds under SwiftShader: 2.1 min at a load of about 80, over the suite's 120 s limit
  test.slow();
  const errors = collectErrors(page);
  const desk = await bootApp(page);
  const boot = await measure(page, desk);
  const first = await applyAndMeasure(page, desk, 'festival');
  expect(first).not.toEqual(boot);
  expect(await applyAndMeasure(page, desk, 'festival')).toEqual(first);
  expect(await applyAndMeasure(page, desk, 'built-in')).toEqual(boot);
  expect(await page.evaluate(() => window.__desk.stage().count)).toBe(405);
  expect(errors).toEqual([]);
});
