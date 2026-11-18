import type { JSHandle } from '@playwright/test';
import type { DeskTestApi } from '../deskApi';
import type { MvrStageInfo } from '../mvrStageInfo';

/**
 * Reads the stage the rig is built from through the MVR test hook. Specs read it here only, so the hook's name lives
 * in one place: Stage Builder has its own `__desk.stage()`, and the MVR hook keeps out of its way.
 */
export function readMvrStage(desk: JSHandle<DeskTestApi>): Promise<MvrStageInfo> {
  return desk.evaluate((d) => d.mvrStage());
}
