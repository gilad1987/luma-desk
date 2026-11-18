/**
 * A show that fails after another file was shown must drop that file's fit: its beam surfaces. The title and the hall
 * follow the stage kind (`followStage`), so the failed show leaves them alone.
 */
import { afterEach, expect, it, vi } from 'vitest';
import { LazyMvrStage } from '../../../../src/app/mvr/LazyMvrStage';
import { createTemplate } from '../../../../src/domain/stage/templates';
import { MvrStage, type MvrStageInput } from '../../../../src/render/mvr/MvrStage';

afterEach(() => vi.restoreAllMocks());

const INPUT: MvrStageInput = {
  design: createTemplate('theatre'),
  geometry: {
    placements: [],
    offset: [0, 0, 0],
    bounds: { min: [-30, 0, -40], max: [30, 12, 40] },
    surfaces: [],
    layers: [],
    hallLayers: [],
  },
  meshes: new Map(),
  meshResources: new Map(),
};

it('forgets the fit of the file before when the next show rejects', async () => {
  const views = { fitTo: vi.fn(), setView: vi.fn(), currentView: 'foh' as const };
  const surfaceHit = { setSurfaces: vi.fn(), setVenue: vi.fn(), setScenery: vi.fn() };
  const hall = { place: vi.fn() };
  const lazy = new LazyMvrStage({ scene: { add: vi.fn() }, views, surfaceHit, sceneLights: { hall } });
  await lazy.show(INPUT);
  expect(hall.place).toHaveBeenCalledTimes(1);
  vi.spyOn(MvrStage.prototype, 'show').mockRejectedValueOnce(new Error('mesh build failed'));
  await expect(lazy.show(INPUT)).rejects.toThrow('mesh build failed');
  expect(surfaceHit.setScenery).toHaveBeenLastCalledWith(null);
  expect(hall.place).toHaveBeenCalledTimes(1);
});
