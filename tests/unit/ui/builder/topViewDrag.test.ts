/**
 * Owns the drag on the top view: a press picks, a move previews without touching the stage, and the drop makes one
 * edit (one undo step) on the 0.5 m grid, or 0.1 m with Alt. Where the snap lands is pinned in `topViewMove.test.ts`.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { pointer } from '../../../shared/dom';
import { mountTopView } from './topViewSetup';

describe('TopView drag', () => {
  afterEach(() => vi.unstubAllGlobals());
  const setup = mountTopView;

  it('moves the dragged fixture on the grid with one edit on drop and no stage apply before it', () => {
    const { stage, session, view, canvas, runFrames } = setup();
    runFrames();
    const edit = vi.spyOn(session, 'edit');
    const [px, py] = view.transform.toCanvas(-5, 2); // fixture 101
    const metre = view.transform.scale;
    canvas.onpointerdown?.(pointer(px, py));
    canvas.onpointermove?.(pointer(px + 0.4 * metre, py));
    canvas.onpointermove?.(pointer(px + 1.2 * metre, py + 0.2 * metre));
    const beforeDrop = [edit.mock.calls.length, stage.applied.length];
    canvas.onpointerup?.(pointer(px + 1.2 * metre, py + 0.2 * metre));
    const moved = session.draft.fixtures.find((f) => f.id === 101)?.position;
    session.undo();
    const undone = session.draft.fixtures.find((f) => f.id === 101)?.position;
    expect([beforeDrop, edit.mock.calls.length, session.selection.fixtures, moved, undone]).toEqual([
      [0, 0],
      1,
      [101],
      [-4, 5.55, 2],
      [-5, 5.55, 2],
    ]);
  });

  it('snaps to 0.1 m while Alt is held', () => {
    const { session, view, canvas, runFrames } = setup();
    runFrames();
    const [px, py] = view.transform.toCanvas(-5, 2);
    canvas.onpointerdown?.(pointer(px, py));
    const alt = { ...pointer(px + 0.33 * view.transform.scale, py), altKey: true };
    canvas.onpointermove?.(alt);
    canvas.onpointerup?.(alt);
    expect(session.draft.fixtures.find((f) => f.id === 101)?.position).toEqual([-4.7, 5.55, 2]);
  });

  it('makes no edit for a click without a move', () => {
    const { session, view, canvas, runFrames } = setup();
    runFrames();
    const [px, py] = view.transform.toCanvas(-5, 2);
    canvas.onpointerdown?.(pointer(px, py));
    canvas.onpointerup?.(pointer(px, py));
    expect([session.canUndo, session.selection.fixtures]).toEqual([false, [101]]);
  });
});
