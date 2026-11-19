import type { Locator } from '@playwright/test';

/** An element's box in CSS pixels as one tuple, so a spec compares boxes with `offBy` and sees every edge at once. */
export type BoxTuple = readonly [x: number, y: number, width: number, height: number];

/** The box of the first element `locator` matches; it throws when the element has no box (absent or not displayed). */
export async function boxOf(locator: Locator): Promise<BoxTuple> {
  const box = await locator.first().boundingBox();
  if (!box) throw new Error(`boxOf: ${locator.toString()} has no box`);
  return [box.x, box.y, box.width, box.height];
}
