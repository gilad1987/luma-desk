import { Matrix4, PerspectiveCamera } from 'three';
import { describe, expect, it, vi } from 'vitest';
import { BeamRanker, createPicks, pickLights } from '../../../../src/render/shadow/rankBeams';
import { beamRows, setRow } from './shadowRows';

/** The projection times view matrix of a camera at z = 20 that looks at the origin. */
function viewProjection(): number[] {
  const camera = new PerspectiveCamera(50, 1, 0.1, 200);
  camera.position.set(0, 4, 20);
  camera.lookAt(0, 4, 0);
  camera.updateMatrixWorld();
  return new Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse).elements;
}

describe('BeamRanker', () => {
  it('orders by peak times the screen part of the cone, and leaves out dark and unseen beams', () => {
    const rows = beamRows(6);
    setRow(rows, 0, { origin: [0, 8, 0], peak: 1 });
    setRow(rows, 1, { origin: [1, 8, 0], peak: 3 });
    setRow(rows, 2, { origin: [2, 8, 0], peak: 0 });
    setRow(rows, 3, { origin: [0, 8, 40], peak: 9 });
    setRow(rows, 4, { origin: [3, 8, 0], peak: 1, tan: 0.6 });
    setRow(rows, 5, { origin: [4, 8, 0], peak: 1 });
    const ranker = new BeamRanker(16);
    const ranked = ranker.rank(rows, 6, viewProjection());
    // 3 is behind the camera, 2 is dark; 4 is three times as wide as 1, so nine times its area beats 1's peak
    expect([...ranker.order.subarray(0, ranked)]).toEqual([4, 1, 0, 5]);
    expect(ranker.scores[2]).toBe(0);
    expect(ranker.scores[3]).toBe(0);
    expect(ranker.scores[1]).toBeCloseTo(3 * (ranker.scores[0] ?? 0), 5);
  });
});

describe('pickLights', () => {
  const layout = { size: 4096, hero: { count: 2, size: 1024 }, secondary: { count: 3, size: 512 } };

  it('gives the best lights hero tiles without a caster test, then only lights with a caster', () => {
    const hasCaster = vi.fn((light: number) => light % 2 === 0);
    const picks = createPicks(5);
    pickLights([9, 7, 5, 4, 3, 2, 8, 6, 1], layout, hasCaster, picks);
    expect(picks.heroes).toBe(2);
    expect([...picks.lights.subarray(0, picks.count)]).toEqual([9, 7, 4, 2, 8]);
    // asked in rank order and no further than the last free tile
    expect(hasCaster.mock.calls.map(([light]) => light)).toEqual([5, 4, 3, 2, 8]);
  });

  it('gives a light without a caster no tile', () => {
    const picks = createPicks(5);
    pickLights([3, 1, 2, 0], layout, () => false, picks);
    expect([...picks.lights.subarray(0, picks.count)]).toEqual([3, 1]);
    pickLights([3], layout, () => true, picks);
    expect([picks.heroes, picks.count]).toEqual([1, 1]);
  });
});
