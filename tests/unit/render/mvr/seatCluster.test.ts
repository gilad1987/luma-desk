/**
 * The Wide, Top and Crowd views frame the stage with its own seats. Every shown proxy is in the scene box, so a far
 * seat block or a few far panels of a shown layer once set the overview and the stage was a small part of it. They
 * are left out of the frame and counted; nothing is hidden.
 */
import { describe, expect, it } from 'vitest';
import type { StageBounds, Vec3 } from '../../../../src/domain/stage/types';
import { seatCluster } from '../../../../src/render/mvr/seatCluster';

const stage: StageBounds = { min: [-12, 0, -10], max: [12, 11, 4] };

/** `rows` rows of `count` seats, 0.55 m a seat and 0.95 m a row, centred on `x`, the first row at `z`. */
const block = (x: number, z: number, count: number, rows: number): Vec3[] =>
  Array.from({ length: rows * count }, (_, i) => [
    x + ((i % count) - (count - 1) / 2) * 0.55,
    0,
    z + Math.floor(i / count) * 0.95,
  ]);

/** The stalls in front of the stage, the rows behind a 6 m cross aisle, and a block of another site 150 m away. */
const STALLS = block(0, 8, 40, 20);
const REAR = block(0, 32, 40, 10);
const FAR_BLOCK = block(150, 60, 30, 10);

describe('seatCluster', () => {
  it('frames the seats near the stage and counts a far seat block', () => {
    const { seats, far } = seatCluster([...FAR_BLOCK, ...STALLS, ...REAR], [], stage);
    if (!seats) throw new Error('no seats');
    expect(seats.min[0]).toBeCloseTo(-10.725);
    expect(seats.max[0]).toBeCloseTo(10.725);
    expect(seats.min[2]).toBe(8);
    expect(seats.max[2]).toBeCloseTo(32 + 9 * 0.95);
    expect(far).toBe(FAR_BLOCK.length);
  });

  it('does not depend on the order of the seats, and leaves out a seat that is not finite', () => {
    const forward = seatCluster([...STALLS, ...REAR, ...FAR_BLOCK, [NaN, 0, 0]], [], stage);
    const backward = seatCluster([...FAR_BLOCK, ...REAR, ...STALLS].reverse(), [], stage);
    expect(forward).toEqual(backward);
  });

  it('keeps a block at the side of the stage that the stalls do not reach', () => {
    const side = block(20, -5, 6, 6);
    const { seats, far } = seatCluster([...STALLS, ...side, ...FAR_BLOCK], [], stage);
    expect(seats?.max[0]).toBeCloseTo(21.375);
    expect(seats?.min[2]).toBe(-5);
    expect(far).toBe(FAR_BLOCK.length);
  });

  it('counts far single panels and frames none of them', () => {
    const panels: Vec3[] = [
      [0, 4, -6],
      [15, 3, 0],
      [200, 3, 0],
      [-180, 3, 5],
    ];
    const lone = seatCluster([], panels, stage);
    expect(lone).toEqual({ far: 2 });
    expect('seats' in lone).toBe(false);
    // a panel behind the last row is near the house, though it is far from the stage
    expect(seatCluster(STALLS, [[0, 3, 34]], stage).far).toBe(0);
    expect(seatCluster([], [[0, 3, 34]], stage).far).toBe(1);
  });

  it('gives no seats when the nearest block is out of reach of the stage', () => {
    expect(seatCluster(FAR_BLOCK, [], stage)).toEqual({ far: FAR_BLOCK.length });
    expect(seatCluster([], [], stage)).toEqual({ far: 0 });
  });
});
