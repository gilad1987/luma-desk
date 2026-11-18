/** Scroll step in px: just under one 21 px sheet row, so the sheet's row snapping still moves on touchpad deltas. */
export const WHEEL_STEP_PX = 20;

/**
 * Adds a wheel delta to the carried remainder and returns the new remainder and the whole steps to scroll, so small
 * touchpad deltas add up instead of being lost. Line-mode deltas (`deltaMode` 1) count as 20 px per line. Its own
 * module because the wheel listener needs a live DOM, and this arithmetic is what the unit test pins.
 */
export function wheelSteps(carry: number, deltaY: number, deltaMode: number): readonly [carry: number, steps: number] {
  const total = carry + (deltaMode ? deltaY * WHEEL_STEP_PX : deltaY),
    steps = Math.trunc(total / WHEEL_STEP_PX);
  return [total - steps * WHEEL_STEP_PX, steps];
}
