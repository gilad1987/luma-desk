// @vitest-environment jsdom
/**
 * buildLayers parses a large import in batches: it gives the page a task boundary between batches, so progress can
 * paint while synchronous 3DS parsing runs, and it reports progress once per file up to the total. Screen placements
 * draw with the import's one LED screen material, even when other placements of the same file are plain scenery.
 */
import { Mesh } from 'three';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { importMvr } from '../../../../src/mvr/index.ts';
import { buildLayers } from '../../../../src/render/mvr/buildLayers.ts';
import { MeshLibrary } from '../../../../src/render/mvr/MeshLibrary.ts';
import { make3ds, meshScene } from '../../../shared/index.ts';

const FILE_COUNT = 20;

afterEach(() => {
  vi.restoreAllMocks();
});

describe('buildLayers', () => {
  it('yields between parse batches and reports progress per file', async () => {
    const names = Array.from({ length: FILE_COUNT }, (_, i) => `prop${i}.3ds`);
    const mesh = make3ds([
      [0, 0, 0],
      [100, 100, 100],
    ]);
    const mvr = meshScene(
      names.map((file) => ({ file })),
      Object.fromEntries(names.map((file) => [file, mesh])),
    );
    const { geometry, meshes } = await importMvr(mvr, { name: 'many' });
    const timeouts = vi.spyOn(globalThis, 'setTimeout');
    const progress: number[] = [];
    await buildLayers(geometry, new MeshLibrary(meshes, new Map()), (done, total) => progress.push(done / total));
    expect(timeouts.mock.calls.filter(([, delay]) => delay === 0).length).toBeGreaterThanOrEqual(2);
    expect(progress).toEqual(Array.from({ length: FILE_COUNT }, (_, i) => (i + 1) / FILE_COUNT));
  });

  it('draws screen placements with the LED screen material and the rest of the same file as scenery', async () => {
    const mesh = make3ds([
      [0, 0, 0],
      [1000, 1000, 10],
    ]);
    const placements = ['a', 'b', 'c'].map((name) => ({ file: 'panel.3ds', layer: name === 'c' ? 'L2' : 'L1' }));
    const imported = await importMvr(meshScene(placements, { 'panel.3ds': mesh }), { name: 'screens' });
    const screenNames = new Map([['S0', 'Upstage LED']]);
    const geometry = {
      ...imported.geometry,
      placements: imported.geometry.placements.map((p) => ({ ...p, name: screenNames.get(p.name) ?? p.name })),
    };
    const library = new MeshLibrary(imported.meshes, new Map());
    const layers = await buildLayers(geometry, library);
    const materialsOf = (uuid: string): unknown[] => {
      const found: unknown[] = [];
      layers.get(uuid)?.traverse((node) => {
        if (node instanceof Mesh) found.push(node.material);
      });
      return found;
    };
    const layerOne = materialsOf('L1');
    expect(layerOne).toContain(library.screenMaterial);
    expect(layerOne.some((material) => material !== library.screenMaterial)).toBe(true);
    expect(materialsOf('L2')).not.toContain(library.screenMaterial);
  });
});
