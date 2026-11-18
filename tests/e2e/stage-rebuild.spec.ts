import { expect, test, type JSHandle, type Page } from '@playwright/test';
import type { DeskTestApi } from '../shared';
import { bootApp, collectErrors } from '../shared/e2e';

type RenderMemory = { geometries: number; textures: number };

/**
 * Applies a stage, runs a few frames (the renderer uploads on draw; test mode draws only on request), then reads the
 * renderer's live GPU counts.
 */
async function applyAndMeasure(page: Page, desk: JSHandle<DeskTestApi>, id: string): Promise<RenderMemory> {
  await page.evaluate((template) => window.__desk.applyTemplate(template), id);
  await desk.evaluate((d) => d.frames(3));
  return page.evaluate(() => window.__desk.renderMemory());
}

test('applying the festival stage twice leaks no geometry or texture, then the built-in stage comes back', async ({
  page,
}) => {
  const errors = collectErrors(page);
  const desk = await bootApp(page);
  const first = await applyAndMeasure(page, desk, 'festival');
  const second = await applyAndMeasure(page, desk, 'festival');
  expect(second).toEqual(first);
  expect(first.geometries).toBeGreaterThan(0);
  await applyAndMeasure(page, desk, 'built-in');
  expect(await page.evaluate(() => window.__desk.stage().count)).toBe(405);
  expect(errors).toEqual([]);
});
