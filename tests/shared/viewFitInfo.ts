/** A rectangle on the page in CSS pixels, y down. */
export interface ScreenRect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/**
 * What `__desk.test.viewFit()` answers (`src/app/testHook/readViewFit.ts`): the screen rectangles around the rig box
 * and the house box (the rig and the seats) of an imported stage, null without such a stage or with a box corner
 * behind the eye, the part of the 3D view that the MA console does not cover, and how many fixtures stand far from
 * the rig box.
 */
export interface ViewFitInfo {
  readonly rig: ScreenRect | null;
  readonly house: ScreenRect | null;
  readonly free: ScreenRect;
  readonly outliers: number;
}
