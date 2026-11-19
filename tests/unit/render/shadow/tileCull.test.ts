import { BufferAttribute, Mesh } from 'three';
import { describe, expect, it } from 'vitest';
import { CasterScene } from '../../../../src/render/shadow/CasterScene';
import { binTriangles } from '../../../../src/render/shadow/casterGrid';
import { boxInTile } from '../../../../src/render/shadow/tileCull';
import { MAX_CELLS } from '../../../../src/render/shadow/triangleCells';
import { mergedBoxes, rootWith } from './casterShapes';
import { tileCameraAt, volumeOf } from './cullShapes';

/** A box of side `size` around a point. */
const boxAt = (x: number, y: number, z: number, size = 0.1): number[] => {
  const h = size / 2;
  return [x - h, y - h, z - h, x + h, y + h, z + h];
};

describe('boxInTile', () => {
  // a beam straight down from (0, 8, 0), 10 m long, apex 1 m behind the lens: the tile sees from y = 7.5 to y = -2
  const volume = volumeOf(tileCameraAt(0));
  const sees = (box: number[]): boolean => boxInTile(volume, box, 0);

  it('keeps a box in the beam and drops one before the near plane, past the far plane or beside the beam', () => {
    expect(sees(boxAt(0, 4, 0))).toBe(true);
    expect(sees(boxAt(0, 7.8, 0))).toBe(false);
    expect(sees(boxAt(0, 9, 0))).toBe(false);
    expect(sees(boxAt(0, -2.5, 0))).toBe(false);
    expect(sees(boxAt(1.2, 0, 0))).toBe(false);
    expect(sees(boxAt(0, 0, -1.2))).toBe(false);
  });

  it('keeps a large box that holds the whole beam, and a flat one that the edge of the tile cuts', () => {
    expect(sees([-50, -50, -50, 50, 50, 50])).toBe(true);
    expect(sees([0.9, 0, -4, 4.9, 0, 4])).toBe(true);
    expect(sees([1, 0, -4, 5, 0, 4])).toBe(false);
  });

  it('drops a box in a corner of the square tile, where the round beam never reads', () => {
    // at y = 0 the tile is 0.936 m to each side
    expect(sees(boxAt(0.85, 0, 0))).toBe(true);
    expect(sees(boxAt(0.85, 0, 0.85))).toBe(false);
  });
});

describe('long triangles', () => {
  const points = (values: number[]): BufferAttribute => new BufferAttribute(new Float32Array(values), 3);

  it('puts a 12 m triangle in every 4 m cell it crosses, with a box no larger than the cell', () => {
    const { index, runs } = binTriangles(points([-6, 0.5, 0.5, 6, 0.5, 0.5, 6, 0.6, 0.5]), (corner) => corner, 1, 4);
    expect(runs).toHaveLength(4);
    expect(index).toHaveLength(12);
    for (const { box } of runs) expect((box[3] ?? 0) - (box[0] ?? 0)).toBeLessThan(4.01);
    expect(Math.min(...runs.map((run) => run.box[0] ?? 0))).toBe(-6);
    expect(Math.max(...runs.map((run) => run.box[3] ?? 0))).toBe(6);
  });

  it('keeps a floor of two triangles in one run, and a floor at y = 0 with noise in one layer of cells', () => {
    const floor = [-40, 1e-7, -30, 40, -1e-7, -30, 40, 1e-7, 30, -40, 1e-7, -30, 40, 1e-7, 30, -40, -1e-7, 30];
    expect(binTriangles(points(floor), (corner) => corner, 2, 4).runs).toHaveLength(1);
    const strip = [0.5, 1e-7, 0.5, 11.5, -1e-7, 0.5, 11.5, 1e-7, 0.6];
    expect(binTriangles(points(strip), (corner) => corner, 1, 4).runs).toHaveLength(3);
    // 80 x 60 m is 300 cells
    expect(MAX_CELLS).toBeLessThan(300);
  });
});

describe('CasterScene.cull', () => {
  it('takes the chunks from three.js culling and leaves a hidden layer hidden', () => {
    const { root, layer } = rootWith(new Mesh(mergedBoxes()));
    const casters = new CasterScene(root);
    expect(casters.parts.objects.every((object) => !object.frustumCulled)).toBe(true);
    layer.visible = false;
    casters.sync();
    casters.cull(tileCameraAt(0));
    expect(casters.parts.objects.some((object) => object.visible)).toBe(false);
  });
});
