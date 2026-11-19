import { expect, test, type Page } from '@playwright/test';
import { bootApp, mvrFile, pickMvrFile, stepFrames } from '../shared/e2e';
import { renderStageMvr } from '../shared';
import { marginsOf, SHARE_SLACK, VIEWS } from './mvrViewFitRules';

// The framing gate of an imported stage: every whole-stage view holds its box in the part of the 3D view that no
// console covers and fills that part, in every layout, for 16:9, 4:3 and ultra-wide windows, and also after the
// window or the layout changed under a view that was already set (the follow path of the camera).
// SwiftShader draws the large windows slowly: 29 to 43 s a row on a Mac, past 120 s for the MA rows on the Linux CI
// runner. Every wait here is on a state (mvrReady, frozen-clock frames), so only the time budget grows, never a result.
test.describe.configure({ timeout: 360_000 });
const LAYOUTS = ['classic', 'desk', 'ma'] as const;
const SIZES = [
  { width: 1280, height: 720 },
  { width: 1920, height: 1080 },
  { width: 2560, height: 1080 },
  { width: 1024, height: 768 },
] as const;
/** The fit rule leaves 6% of the free rectangle empty on each side; no side may have less than this. */
const MIN_MARGIN = 0.055;
/**
 * The least share of the free rectangle the box takes on its binding axis, measured about the centre of the free
 * rectangle: 1 - 2 x the smallest margin. The fit gives 0.88; a box fitted at half its size gives 0.44.
 */
const MIN_BOUND = 0.85;

type Layout = (typeof LAYOUTS)[number];
/** What happens between the view button and the measurement; `null` measures the view as it was set. */
type Change = ((page: Page) => Promise<unknown>) | null;
const resized: Change = (page) => page.setViewportSize({ width: 1500, height: 900 });
const switched =
  (to: Layout): Change =>
  (page) =>
    page.locator('#layoutSel').selectOption(to);

interface Row {
  readonly name: string;
  readonly layout: Layout;
  readonly size: (typeof SIZES)[number];
  readonly change: Change;
}

const ROWS: Row[] = [
  ...LAYOUTS.flatMap((layout) =>
    SIZES.map((size) => ({ name: `${layout} ${size.width}x${size.height}`, layout, size, change: null })),
  ),
  { name: 'classic 1920x1080, then resized', layout: 'classic', size: SIZES[1], change: resized },
  { name: 'ma 1920x1080, then resized', layout: 'ma', size: SIZES[1], change: resized },
  { name: 'classic 1920x1080, then the MA layout', layout: 'classic', size: SIZES[1], change: switched('ma') },
  { name: 'ma 1920x1080, then the classic layout', layout: 'ma', size: SIZES[1], change: switched('classic') },
];

for (const { name, layout, size, change } of ROWS) {
  test(`MVR views hold their box in the free view / ${name}`, async ({ page }) => {
    await page.setViewportSize(size);
    const desk = await bootApp(page, { layout });
    await pickMvrFile(page, desk, mvrFile('RenderStage.mvr', renderStageMvr()));
    await page.locator('#mvrSummaryClose').click();
    // one frame, so the camera has seen the frame of this window and layout before the first view is set
    await stepFrames(desk, 0, 1);
    await desk.evaluate((d) => d.mvrReady());
    const report: Record<string, unknown> = {};
    for (const [view, stageFill] of VIEWS) {
      if (change) {
        // back to the first window and layout, so every view meets the change while it is the current one
        await page.setViewportSize(size);
        await page.locator('#layoutSel').selectOption(layout);
        await stepFrames(desk, 0, 2);
      }
      await page.evaluate((v) => window.__desk.setView(v, true), view);
      await stepFrames(desk, 0, 1);
      await change?.(page);
      await stepFrames(desk, 0, 2);
      const fit = await desk.evaluate((d) => d.viewFit());
      const { rig, house, free } = fit;
      if (!rig) throw new Error(`${view}: no rig rectangle`);
      const margins = marginsOf(rig, free);
      // the house is whole when every side of it has the margin; a cut house has a side outside, or behind the eye
      const whole = house !== null && Math.min(...Object.values(marginsOf(house, free))) >= MIN_MARGIN;
      const bound = 1 - 2 * Math.min(...Object.values(marginsOf(stageFill && whole ? house : rig, free)));
      const fill = stageFill?.(rig, free) ?? null;
      report[view] = { rig, house, free, margins, bound, fill };
      for (const [side, share] of Object.entries(margins)) {
        expect(share, `${view}: ${side} margin`).toBeGreaterThanOrEqual(MIN_MARGIN);
      }
      // a whole house fills the frame as the rig does in the other views; a cut one leaves the stage at its least
      if (fill === null || whole) expect(bound, `${view}: binding-axis fill`).toBeGreaterThanOrEqual(MIN_BOUND);
      else expect(fill, `${view}: stage share of a cut house`).toBeLessThanOrEqual(1 + 2 * SHARE_SLACK);
      if (fill !== null) expect(fill, `${view}: stage share`).toBeGreaterThanOrEqual(1 - SHARE_SLACK);
    }
    // the numbers go to the report of the run, so a failure shows how far off the frame is
    await test.info().attach('view-fit', { body: JSON.stringify(report, null, 2), contentType: 'application/json' });
  });
}
