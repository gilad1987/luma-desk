import { describe, expect, it } from 'vitest';
import { ROW } from '../../../../src/render/beams/packBeam';
import { EXTRA, LightBatch } from '../../../../src/render/lighting/LightBatch';
import type { ShadowLayers } from '../../../../src/render/lighting/ShadowSource';

const createCarrier = (visible = true): { visible: boolean; parent: object | null } => ({ visible, parent: {} });

/** The offers are kept to read back. */
function createShadows(): ShadowLayers & { readonly offers: [number, number][] } {
  const offers: [number, number][] = [];
  return { offers, offer: (id, index) => void offers.push([id, index]) };
}

describe('LightBatch', () => {
  it('packs the beam row of each lit fixture once, with its extras at the same index', () => {
    const batch = new LightBatch();
    const rowA = new Float32Array(ROW).fill(1);
    const rowB = new Float32Array(ROW).fill(2);
    batch.offer(createCarrier(), 5, rowA, 0.5);
    batch.offer(createCarrier(false), 6, new Float32Array(ROW).fill(9), 1);
    batch.offer(createCarrier(), 7, rowB, 0.25);
    const rows = new Float32Array(4 * ROW);
    const extras = new Float32Array(4 * EXTRA);
    const shadows = createShadows();
    expect(batch.flush(rows, extras, shadows)).toBe(2);
    expect([...rows.subarray(0, ROW)]).toEqual([...rowA]);
    expect([...rows.subarray(ROW, 2 * ROW)]).toEqual([...rowB]);
    expect([...extras.subarray(0, 2 * EXTRA)]).toEqual([-1, 0.5, 0, 0, -1, 0.25, 0, 0]);
    expect(shadows.offers).toEqual([
      [5, 0],
      [7, 1],
    ]);
  });

  it('counts a key light once: its shadow is a layer on its one row, not a second light', () => {
    const batch = new LightBatch();
    batch.offer(createCarrier(), 7, new Float32Array(ROW).fill(3), 1);
    const rows = new Float32Array(2 * ROW);
    const extras = new Float32Array(2 * EXTRA);
    expect(batch.flush(rows, extras.fill(5), createShadows())).toBe(1);
    // no layer from the packing: the shadows write it once the keys of the frame are known
    expect(extras[0]).toBe(-1);
    expect([...rows.subarray(ROW)]).toEqual(new Array<number>(ROW).fill(0));
  });

  it('follows a fixture that offers again and drops one that left the stage', () => {
    const batch = new LightBatch();
    const carrier = createCarrier();
    const row = new Float32Array(ROW);
    batch.offer(carrier, 5, row, 0.5);
    batch.offer(carrier, 5, row, 0.75);
    expect(batch.size).toBe(1);
    const extras = new Float32Array(EXTRA);
    batch.flush(new Float32Array(ROW), extras, createShadows());
    expect(extras[1]).toBe(0.75);
    carrier.parent = null;
    expect(batch.flush(new Float32Array(ROW), extras, createShadows())).toBe(0);
    expect(batch.size).toBe(0);
  });
});
