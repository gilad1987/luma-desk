/**
 * Owns when the plan view fits its transform and repaints for its size: the fit is reused while the draft and the
 * canvas size stay the same (every drag frame), and a canvas resize asks for a frame. The drawing is in
 * `PlanView.test.ts`.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FakeResizeObserver } from '../../../../shared/dom';
import { mountPlanView } from './planSetup';

describe('PlanView refit', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('keeps the transform over the frames of one draft and fits again after an edit or a resize', () => {
    const { session, view, canvas, runFrames } = mountPlanView();
    runFrames();
    const first = view.transform;
    view.preview(null);
    runFrames();
    const sameDraft = view.transform;
    session.edit((d) => ({ ...d }));
    runFrames();
    const edited = view.transform;
    Object.assign(canvas, { offsetWidth: 300 });
    FakeResizeObserver.resizeAll();
    runFrames();
    expect([sameDraft === first, edited === first, view.transform === edited]).toEqual([true, false, false]);
  });

  it('asks for a frame when the canvas box changes size, and none when the observer fires with the same size', () => {
    const { canvas, frames, runFrames } = mountPlanView();
    runFrames();
    FakeResizeObserver.resizeAll();
    const sameSize = frames.length;
    Object.assign(canvas, { offsetWidth: 300 });
    FakeResizeObserver.resizeAll();
    expect([sameSize, frames.length]).toEqual([0, 1]);
  });
});
