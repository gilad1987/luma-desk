/**
 * Owns the scenery flag of the lazy MVR scenery: a `show` that rejects (a mesh build that throws) leaves no scenery
 * behind, so the test hook does not report layers that were never drawn. Also owns the camera fit: a shown scenery
 * fits the views to the design and scenery bounds, so a file larger than the stage is framed whole.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LazyMvrStage } from '../../../../src/app/mvr/LazyMvrStage';
import { createTemplate } from '../../../../src/domain/stage/templates';
import { mvrCameraBounds } from '../../../../src/render/mvr/mvrCameraBounds';
import { MvrStage, type MvrStageInput } from '../../../../src/render/mvr/MvrStage';

afterEach(() => vi.restoreAllMocks());

/** A made-up scenery of 60 m x 80 m, much larger than any stage template. */
const INPUT: MvrStageInput = {
  design: createTemplate('theatre'),
  geometry: { placements: [], offset: [0, 0, 0], bounds: { min: [-30, 0, -40], max: [30, 12, 40] }, surfaces: [] },
  meshes: new Map(),
  meshResources: new Map(),
};

/** A lazy scenery over a fake scene and fake camera views that stand in the FOH view. */
function lazyStage() {
  const views = { fitTo: vi.fn(), setView: vi.fn(), currentView: 'foh' as const };
  return { lazy: new LazyMvrStage({ scene: { add: vi.fn() }, views }), views };
}

describe('LazyMvrStage', () => {
  it('has scenery after a show that resolves', async () => {
    const { lazy } = lazyStage();
    await lazy.show(INPUT);
    expect(lazy.hasScenery).toBe(true);
  });

  it('has no scenery after a show that rejects', async () => {
    vi.spyOn(MvrStage.prototype, 'show').mockRejectedValue(new Error('mesh build failed'));
    const { lazy, views } = lazyStage();
    await expect(lazy.show(INPUT)).rejects.toThrow('mesh build failed');
    expect(lazy.hasScenery).toBe(false);
    expect(views.fitTo).not.toHaveBeenCalled();
  });

  it('fits the views to the design and scenery bounds after a show, then moves to the current view', async () => {
    const { lazy, views } = lazyStage();
    await lazy.show(INPUT);
    expect(views.fitTo).toHaveBeenCalledWith(mvrCameraBounds(INPUT.design, INPUT.geometry));
    expect(views.setView).toHaveBeenCalledWith('foh');
    const [fit] = views.fitTo.mock.invocationCallOrder;
    const [move] = views.setView.mock.invocationCallOrder;
    expect(fit).toBeLessThan(move ?? 0);
  });

  it('does not fit when the scenery is disposed while the show still builds', async () => {
    const { lazy, views } = lazyStage();
    const shown = lazy.show(INPUT);
    lazy.dispose();
    await shown;
    expect(views.fitTo).not.toHaveBeenCalled();
    expect(views.setView).not.toHaveBeenCalled();
  });
});
