import { describe, expect, it } from 'vitest';
import { ROW } from '../../../../src/render/beams/packBeam';
import { REFRESHES } from '../../../../src/render/lighting/KeyShadowMaps';
import { KEYS, KeyShadows } from '../../../../src/render/lighting/KeyShadows';
import { keyScore } from '../../../../src/render/lighting/keyScore';

/** `count` landed front beams in packed rows; a higher index is a weaker key. */
function createRows(count: number): Float32Array {
  const rows = new Float32Array(count * ROW);
  for (let i = 0; i < count; i++) rows.set([i, 8, 10, 12, 0, -0.6, -0.8, 0.1, 9 - i * 0.5, 9, 9, 0.8], i * ROW);
  return rows;
}

/** One frame: every row is offered under fixture id 100 + index, then the offers end. */
function frame(keys: KeyShadows, rows: Float32Array, stamp = 1): void {
  for (let i = 0; i < rows.length / ROW; i++) keys.offer(100 + i, i, rows.subarray(i * ROW, (i + 1) * ROW));
  keys.update(rows, new Float32Array((rows.length / ROW) * 4), stamp);
}

function drawAll(keys: KeyShadows): number[] {
  const slots: number[] = [];
  for (let slot = keys.next(); slot >= 0; slot = keys.next()) {
    keys.drawn(slot);
    slots.push(slot);
  }
  return slots;
}

describe('KeyShadows', () => {
  it('scores a front light above a back light and gives a beam that ends in the air no map', () => {
    const front = createRows(1);
    const back = createRows(1);
    back[6] = 0.8;
    const free = createRows(1);
    free[15] = 1;
    expect(keyScore(front)).toBeGreaterThan(keyScore(back));
    expect(keyScore(free)).toBe(0);
  });

  it('names a layer by fixture id, and only once the map of that fixture is drawn', () => {
    const keys = new KeyShadows();
    frame(keys, createRows(2));
    expect(keys.layerOf(100)).toBe(-1);
    expect(drawAll(keys)).toHaveLength(2);
    expect(keys.layerOf(100)).toBeGreaterThanOrEqual(0);
    expect(keys.layerOf(101)).not.toBe(keys.layerOf(100));
    expect(keys.layerOf(999)).toBe(-1);
  });

  it('draws nothing at rest, one map for a key that moved, and every map for new scenery', () => {
    const keys = new KeyShadows();
    const rows = createRows(3);
    frame(keys, rows);
    drawAll(keys);
    frame(keys, rows);
    expect(keys.next()).toBe(-1);
    rows[ROW + 4] = 0.1;
    frame(keys, rows);
    expect(drawAll(keys)).toEqual([keys.layerOf(101)]);
    frame(keys, rows, 2);
    expect(drawAll(keys)).toHaveLength(3);
  });

  it('keeps at most as many keys as it has maps, the strongest, and a dark key keeps its map', () => {
    const keys = new KeyShadows();
    frame(keys, createRows(KEYS + 3));
    drawAll(keys);
    expect(keys.layerOf(100 + KEYS - 1)).toBeGreaterThanOrEqual(0);
    expect(keys.layerOf(100 + KEYS)).toBe(-1);
    const slot = keys.layerOf(103);
    // a frame in which fixture 103 is dark (a strobe): nobody needs its slot
    keys.update(createRows(0), new Float32Array(0), 1);
    expect(keys.layerOf(103)).toBe(slot);
    expect(keys.next()).toBe(-1);
  });

  it('shares the draws of a frame in turn when many keys move', () => {
    const keys = new KeyShadows();
    const rows = createRows(5);
    frame(keys, rows);
    const order: number[] = [];
    for (let draws = 0; draws < 5; draws++) {
      for (let n = 0; n < REFRESHES; n++) {
        const slot = keys.next();
        if (slot < 0) break;
        keys.drawn(slot);
        order.push(slot);
      }
    }
    expect(REFRESHES).toBe(1);
    expect([...order].sort()).toEqual([0, 1, 2, 3, 4]);
  });
});
