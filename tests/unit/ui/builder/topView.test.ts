/**
 * Owns the top view component: the canvas in the view slot, one draw per frame however many changes come, the
 * selection colour, and dispose. The drag is in `topViewDrag.test.ts`; the pure transform, pick and snap are in
 * `topViewGeometry.test.ts` and `topViewMove.test.ts`.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mountTopView } from './topViewSetup';

describe('TopView', () => {
  afterEach(() => vi.unstubAllGlobals());
  const setup = mountTopView;

  it('draws once per frame however many changes come in that frame', () => {
    const { session, frames, calls, runFrames } = setup();
    session.select({ fixtures: [101], trusses: [] });
    session.select({ fixtures: [], trusses: ['front'] });
    const pending = frames.length;
    runFrames();
    const backgrounds = calls
      .filter(([name]) => name === 'fillStyle=')
      .filter(([, v]) => v === '--top-view-background');
    expect([pending, backgrounds.length]).toEqual([1, 1]);
  });

  it('draws the selected truss in the selection colour, and no LED wall line on a stage without one', () => {
    const { session, calls, runFrames } = setup();
    session.select({ fixtures: [], trusses: ['front'] });
    runFrames();
    expect(calls.filter(([name]) => name === 'strokeStyle=').map(([, v]) => v)).toEqual([
      '--top-view-grid',
      '--top-view-truss',
      '--top-view-selected',
    ]);
  });

  it('cancels its pending frame, stops following the session and removes the canvas on dispose', () => {
    const { session, slot, view, frames, cancelled } = setup();
    view.dispose();
    session.select({ fixtures: [101], trusses: [] });
    expect([cancelled, frames.length, slot.children.length]).toEqual([[1], 1, 0]);
  });
});
