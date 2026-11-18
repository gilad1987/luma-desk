import type { JSHandle } from '@playwright/test';
import type { DeskTestApi, StageInfo } from '../deskApi';

/**
 * Reads the stage the rig is built from through the MVR test hook. Specs read it here only, so the hook's name lives
 * in one place: Stage Builder has its own `__desk.stage()`, and the MVR hook keeps out of its way.
 */
export function readMvrStage(desk: JSHandle<DeskTestApi>): Promise<StageInfo> {
  return desk.evaluate((d) => d.mvrStage());
}
