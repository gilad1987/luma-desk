import { describe, expect, it } from 'vitest';
import { ROW } from '../../../../src/render/beams/packBeam';
import { KEYS, KeyShadows } from '../../../../src/render/lighting/KeyShadows';
import { EXTRA } from '../../../../src/render/lighting/LightBatch';
import { HOLD } from '../../../../src/render/lighting/SlotHold';

/** Two more landed front beams than there are maps; a higher index is a weaker key, except the last, the strongest. */
const ROWS = new Float32Array((KEYS + 2) * ROW);
const colour = (i: number): number => (i > KEYS ? 20 : 9 - i * 0.5);
for (let i = 0; i <= KEYS + 1; i++) {
  const c = colour(i);
  ROWS.set([i, 8, 10, 12, 0, -0.6, -0.8, 0.1, c, c, c, 0.8], i * ROW);
}
const EXTRAS = new Float32Array((KEYS + 2) * EXTRA);
/** The strongest key, a strobe; the weakest key enters the best `KEYS` offers in each frame the strobe is dark. */
const [STROBE, WEAKEST, STRONG] = [100, 100 + KEYS, 101 + KEYS];
/** The rows offered in a frame: all but the strongest, and so with the strobe dark. */
const LIT = Array.from({ length: KEYS + 1 }, (_, i) => i);
const DARK = LIT.slice(1);

/** One frame of fixtures 100 + index of `lit`. Draws what is out of date, as the maps do. */
function frame(keys: KeyShadows, lit: readonly number[], rows = ROWS): number[] {
  for (const i of lit) keys.offer(100 + i, i, rows.subarray(i * ROW, (i + 1) * ROW));
  keys.update(rows, EXTRAS, 1);
  const drawn: number[] = [];
  for (let slot = keys.next(); slot >= 0; slot = keys.next()) {
    keys.drawn(slot);
    drawn.push(slot);
  }
  return drawn;
}

describe('KeyShadows with more keys than maps', () => {
  it('ranks the keys of the test rows: a higher index is a weaker key, also when it offers first', () => {
    const keys = new KeyShadows();
    frame(keys, [...LIT].reverse());
    expect(LIT.map((i) => keys.layerOf(100 + i) >= 0)).toEqual([...Array<boolean>(KEYS).fill(true), false]);
  });

  it('keeps the map of a strobe in the best keys: the weaker key that fills its place in a dark frame waits', () => {
    const keys = new KeyShadows();
    expect(frame(keys, LIT)).toHaveLength(KEYS);
    const slot = keys.layerOf(STROBE);
    expect(slot).toBeGreaterThanOrEqual(0);
    for (let n = 0; n < 20; n++) {
      // each second frame is dark: no map changes hands and none is drawn again
      expect(frame(keys, n % 2 === 1 ? LIT : DARK)).toEqual([]);
      expect(keys.layerOf(STROBE)).toBe(slot);
      expect(keys.layerOf(WEAKEST)).toBe(-1);
    }
  });

  it('gives the slot of a key that is dark for longer than HOLD frames to the key that waits', () => {
    const keys = new KeyShadows();
    frame(keys, LIT);
    const slot = keys.layerOf(STROBE);
    for (let n = 0; n < HOLD; n++) frame(keys, DARK);
    expect([keys.layerOf(STROBE), keys.layerOf(WEAKEST)]).toEqual([slot, -1]);
    expect(frame(keys, DARK)).toEqual([slot]);
    expect([keys.layerOf(STROBE), keys.layerOf(WEAKEST)]).toEqual([-1, slot]);
  });

  it('gives a held slot at once to a new key stronger than the dark key', () => {
    const keys = new KeyShadows();
    frame(keys, LIT);
    const slot = keys.layerOf(STROBE);
    expect(frame(keys, [...DARK, KEYS + 1])).toEqual([slot]);
    expect([keys.layerOf(STROBE), keys.layerOf(STRONG)]).toEqual([-1, slot]);
  });

  it('holds nothing for a key that dims below the next one but stays lit: that key takes its slot at once', () => {
    const keys = new KeyShadows();
    frame(keys, LIT);
    const [dimmed, next] = [KEYS - 1, KEYS];
    const slot = keys.layerOf(100 + dimmed);
    const dim = ROWS.slice();
    dim.fill(colour(next) - 0.5, dimmed * ROW + 8, dimmed * ROW + 11);
    expect(frame(keys, LIT, dim)).toEqual([slot]);
    expect([keys.layerOf(100 + dimmed), keys.layerOf(100 + next)]).toEqual([-1, slot]);
    expect(EXTRAS[next * EXTRA]).toBe(-1);
    // the map of the key that passed was drawn in that frame: the next frame reads it
    expect(frame(keys, LIT, dim)).toEqual([]);
    expect(EXTRAS[next * EXTRA]).toBe(slot);
  });
});
