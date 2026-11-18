// @vitest-environment jsdom
/**
 * buildLayers parses a large import in batches: it gives the page a task boundary between batches, so progress can
 * paint while synchronous 3DS parsing runs, and it reports progress once per file up to the total.
 */
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
    await buildLayers(geometry, new MeshLibrary(meshes), (done, total) => progress.push(done / total));
    expect(timeouts.mock.calls.filter(([, delay]) => delay === 0).length).toBeGreaterThanOrEqual(2);
    expect(progress).toEqual(Array.from({ length: FILE_COUNT }, (_, i) => (i + 1) / FILE_COUNT));
  });
});
