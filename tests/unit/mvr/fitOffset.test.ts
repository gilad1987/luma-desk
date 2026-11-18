import { describe, expect, it } from 'vitest';
import { STAGE } from '../../../src/domain/venue.ts';
import { fitOffset } from '../../../src/mvr/design/fitOffset.ts';
import { placementBoxes, topSurfaces } from '../../../src/mvr/design/surfaces.ts';
import { emptyBox, type Aabb } from '../../../src/mvr/math/Aabb.ts';
import type { MvrWarning } from '../../../src/mvr/MvrWarning.ts';
import { mvrMatrix } from '../../shared/index.ts';

const CENTRE_Z = (STAGE.z0 + STAGE.z1) / 2;

function fit(box: Aabb): { offset: readonly number[]; codes: string[] } {
  const warnings: MvrWarning[] = [];
  const offset = fitOffset(box, (w) => warnings.push(w));
  return { offset, codes: warnings.map((w) => w.code) };
}

describe('fitOffset', () => {
  it('centres x and z on the stage and keeps MVR Z = 0 on the ground, without scaling', () => {
    const { offset, codes } = fit({ min: [8, -1, 0], max: [12, 9, 10] });
    expect(offset).toEqual([-10, 0, CENTRE_Z - 5]);
    expect(codes).toEqual([]);
  });

  it('warns `oversize` when the footprint is wider or deeper than the stage', () => {
    expect(fit({ min: [-30, 0, 0], max: [30, 1, 1] }).codes).toEqual(['oversize']);
    expect(fit({ min: [0, 0, -15], max: [1, 1, 15] }).codes).toEqual(['oversize']);
  });

  it('puts an empty file at the stage centre', () => {
    expect(fit(emptyBox()).offset).toEqual([0, 0, CENTRE_Z]);
  });
});

describe('surfaces', () => {
  const meshBoxes = new Map([['deck.3ds', { min: [-1000, -1000, 0], max: [1000, 1000, 500] } as const]]);
  const placement = (file: string): Parameters<typeof placementBoxes>[0][number] => ({
    file,
    matrix: mvrMatrix('{1,0,0}{0,1,0}{0,0,1}{3000,0,1000}'),
    layer: 'l',
    kind: 'SceneObject',
    name: 'Deck',
    uuid: file,
  });

  it('places mesh boxes in the three frame and skips meshes without bounds', () => {
    const boxes = placementBoxes([placement('deck.3ds'), placement('gone.3ds')], meshBoxes);
    expect(boxes.map((b) => [...b.min, ...b.max].map((v) => v + 0))).toEqual([[2, 1, -1, 4, 1.5, 1]]);
  });

  it('marks fitted boxes as top faces', () => {
    const surfaces = topSurfaces([{ min: [0, 0, 0], max: [1, 1, 1] }], [10, 0, -5]);
    expect(surfaces).toEqual([{ min: [10, 0, -5], max: [11, 1, -4], face: 'top' }]);
  });
});
