/**
 * Owns the scenery flag of the lazy MVR scenery: a `show` that rejects (a mesh build that throws) leaves no scenery
 * behind, so the test hook does not report layers that were never drawn.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LazyMvrStage } from '../../../../src/app/mvr/LazyMvrStage';
import { createTemplate } from '../../../../src/domain/stage/templates';
import { MvrStage, type MvrStageInput } from '../../../../src/render/mvr/MvrStage';

afterEach(() => vi.restoreAllMocks());

const INPUT: MvrStageInput = {
  design: createTemplate('theatre'),
  geometry: { placements: [], offset: [0, 0, 0], bounds: { min: [0, 0, 0], max: [1, 1, 1] }, surfaces: [] },
  meshes: new Map(),
  meshResources: new Map(),
};

describe('LazyMvrStage', () => {
  it('has scenery after a show that resolves', async () => {
    const lazy = new LazyMvrStage({ add: vi.fn() });
    await lazy.show(INPUT);
    expect(lazy.hasScenery).toBe(true);
  });

  it('has no scenery after a show that rejects', async () => {
    vi.spyOn(MvrStage.prototype, 'show').mockRejectedValue(new Error('mesh build failed'));
    const lazy = new LazyMvrStage({ add: vi.fn() });
    await expect(lazy.show(INPUT)).rejects.toThrow('mesh build failed');
    expect(lazy.hasScenery).toBe(false);
  });
});
