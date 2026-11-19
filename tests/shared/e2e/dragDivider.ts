import type { Page } from '@playwright/test';
import { boxOf } from './boxOf';

// classes: the panes are plain <div> slots of the split panel, with no role or id
const VIEW_PANE = '.builder-3d';
const PLAN_PANE = '.builder-plan';

/**
 * Drags the builder's split divider `dy` pixels down (up when negative) with the mouse, as a user does. The divider
 * lies between the 3D pane (above) and the plan pane (below), so the press goes to the middle of that gap.
 */
export async function dragDivider(page: Page, dy: number): Promise<void> {
  const [x, viewY, width, viewHeight] = await boxOf(page.locator(VIEW_PANE));
  const [, planY] = await boxOf(page.locator(PLAN_PANE));
  const atX = x + width / 2;
  const atY = (viewY + viewHeight + planY) / 2;
  await page.mouse.move(atX, atY);
  await page.mouse.down();
  await page.mouse.move(atX, atY + dy, { steps: 5 });
  await page.mouse.up();
}
