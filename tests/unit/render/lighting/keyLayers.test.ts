import { describe, expect, it } from 'vitest';
import { ROW } from '../../../../src/render/beams/packBeam';
import { KEYS, KeyShadows } from '../../../../src/render/lighting/KeyShadows';
import { EXTRA, LightBatch } from '../../../../src/render/lighting/LightBatch';

/** A landed front beam; a higher `peak` is a stronger key. */
function createRow(peak: number): Float32Array {
  const row = new Float32Array(ROW);
  row.set([0, 8, 10, 12, 0, -0.6, -0.8, 0.1, peak, peak, peak, 0.8]);
  return row;
}

/** One frame as the pass runs it: the batch packs and offers, then the shadows give the slots and write the layers. */
function frame(batch: LightBatch, keys: KeyShadows): Float32Array {
  const rows = new Float32Array(batch.size * ROW);
  const extras = new Float32Array(batch.size * EXTRA).fill(7);
  batch.flush(rows, extras, keys);
  keys.update(rows, extras, 1);
  return extras;
}

function drawAll(keys: KeyShadows): void {
  for (let slot = keys.next(); slot >= 0; slot = keys.next()) keys.drawn(slot);
}

describe('the shadow layer of a light row', () => {
  it('is none until the first map of the fixture is drawn, then its own slot', () => {
    const batch = new LightBatch();
    const keys = new KeyShadows();
    batch.offer({ visible: true, parent: {} }, 40, createRow(5), 1);
    expect(frame(batch, keys)[0]).toBe(-1);
    drawAll(keys);
    expect(frame(batch, keys)[0]).toBe(keys.layerOf(40));
    expect(keys.layerOf(40)).toBeGreaterThanOrEqual(0);
  });

  it('is none in the frame a fixture loses its slot: it never reads the map of the key that took it', () => {
    const batch = new LightBatch();
    const keys = new KeyShadows();
    // fixtures 0 to 7 hold every slot; fixture 0 is the weakest
    for (let id = 0; id < KEYS; id++) batch.offer({ visible: true, parent: {} }, id, createRow(1 + id), 1);
    frame(batch, keys);
    drawAll(keys);
    const taken = keys.layerOf(0);
    expect(frame(batch, keys)[0]).toBe(taken);
    // a chase: fixture 99 comes up stronger than all and takes the slot of the weakest
    batch.offer({ visible: true, parent: {} }, 99, createRow(50), 1);
    const extras = frame(batch, keys);
    expect(extras[0]).toBe(-1);
    expect(extras[KEYS * EXTRA]).toBe(-1);
    expect(extras[EXTRA]).toBe(keys.layerOf(1));
    drawAll(keys);
    const next = frame(batch, keys);
    expect(next[KEYS * EXTRA]).toBe(taken);
    expect(next[0]).toBe(-1);
  });

  it('is none for a lit fixture that is no key in this frame, though it keeps its slot for its return', () => {
    const batch = new LightBatch();
    const keys = new KeyShadows();
    const row = createRow(5);
    batch.offer({ visible: true, parent: {} }, 40, row, 1);
    frame(batch, keys);
    drawAll(keys);
    // the beam now ends in the air: its map shows an older pose and no figure is in its light
    row[15] = 1;
    expect(frame(batch, keys)[0]).toBe(-1);
    row[15] = 0;
    expect(frame(batch, keys)[0]).toBe(keys.layerOf(40));
  });
});
