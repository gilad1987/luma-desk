/**
 * Owns the top view component: the canvas in the view slot, one draw per frame however many changes come, the
 * selection colour, and dispose. The drag is in `topViewDrag.test.ts`; the pure transform, pick and snap are in
 * `topViewGeometry.test.ts` and `topViewMove.test.ts`.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FakeResizeObserver } from '../../../shared/dom';
import { prop } from './toolsDom';
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

  it('cancels its pending frame and removes the canvas on dispose', () => {
    const { slot, view, cancelled } = setup();
    view.dispose();
    expect([cancelled, slot.children.length]).toEqual([[1], 0]);
  });

  it('asks for no frame after dispose, however the session changes', () => {
    const { session, view, frames, runFrames } = setup();
    runFrames();
    view.dispose();
    session.select({ fixtures: [101], trusses: [] });
    expect(frames.length).toBe(0);
  });

  it('draws the draft when the domain refuses the preview, and passes other errors on', () => {
    const { view, runFrames } = setup();
    runFrames();
    view.preview(() => {
      throw new RangeError('refused');
    });
    expect(() => runFrames()).not.toThrow();
    view.preview(() => {
      throw new TypeError('bug');
    });
    expect(() => runFrames()).toThrow(TypeError);
  });

  it('sizes the canvas and reads the CSS palette only when the canvas box changes', () => {
    const { canvas, view, runFrames } = setup();
    const style = vi.fn(() => ({ getPropertyValue: (name: string) => name }));
    vi.stubGlobal('getComputedStyle', style);
    runFrames();
    Object.assign(canvas, { width: 1 });
    view.preview(null);
    runFrames();
    const sameBox = [style.mock.calls.length, prop(canvas, 'width')];
    Object.assign(canvas, { offsetWidth: 300 });
    FakeResizeObserver.resizeAll();
    view.preview(null);
    runFrames();
    expect([sameBox, style.mock.calls.length, prop(canvas, 'width')]).toEqual([[1, 1], 2, 300]);
  });
});
