import { expect, type JSHandle, type Page } from '@playwright/test';
import type { ShadowConfig } from '../../../src/render/shadow/shadowConfig';
import type { ShadowTestApi } from '../../../src/app/testHook/shadowHook';
import type { DeskTestApi } from '../deskApi';
import { renderStageMvr } from '../mvr/renderStageMvr';
import { pickMvrFile } from './pickMvrFile';
import { mvrFile } from './syntheticMvr';

declare global {
  interface Window {
    /** The shadow atlas hook; it arrives a moment after `__desk`, as a lazy chunk. */
    __deskShadow?: ShadowTestApi;
  }
}

/**
 * Shows the synthetic render stage with every fixture at full and the shadow atlas on (with `changes` to its
 * config), and waits until the atlas sees lit beams: the beam rows exist only once the lazy MVR post chain has
 * loaded and a frame has synced the fixtures into its batch.
 */
export async function showShadowStage(
  page: Page,
  desk: JSHandle<DeskTestApi>,
  changes: Partial<ShadowConfig> = {},
): Promise<void> {
  await page.waitForFunction(() => window.__deskShadow !== undefined);
  await pickMvrFile(page, desk, mvrFile('RenderStage.mvr', renderStageMvr()));
  await desk.evaluate((d) => d.run('Fixture 101 Thru 140 At 100'));
  await desk.evaluate((d) => d.outputAt(11));
  await page.evaluate((config) => window.__deskShadow?.enable(true, config), changes);
  // software WebGL draws a frame in about a second, and the chain is a lazy chunk: allow it a minute and a half
  const lights = async (): Promise<number> => {
    await desk.evaluate((d) => d.frames(1));
    return page.evaluate(() => window.__deskShadow?.frame()?.lights ?? 0);
  };
  await expect.poll(lights, { timeout: 90_000 }).toBeGreaterThan(0);
}
