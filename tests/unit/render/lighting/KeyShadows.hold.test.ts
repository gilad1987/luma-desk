import { describe, expect, it } from 'vitest';
import { ROW } from '../../../../src/render/beams/packBeam';
import { KEYS, KeyShadows } from '../../../../src/render/lighting/KeyShadows';
import { HOLD } from '../../../../src/render/lighting/SlotHold';

/** One more landed front beam than there are maps; a higher index is a weaker key. */
const ROWS = new Float32Array((KEYS + 1) * ROW);
for (let i = 0; i <= KEYS; i++) ROWS.set([i, 8, 10, 12, 0, -0.6, -0.8, 0.1, 9 - i * 0.5, 9, 9, 0.8], i * ROW);
/** The strongest key, a strobe; the weakest key enters the best `KEYS` offers in each frame the strobe is dark. */
const [STROBE, WEAKEST] = [100, 100 + KEYS];

/** One frame of fixtures 100 + index; a dark strobe offers nothing. Draws what is out of date, as the maps do. */
function frame(keys: KeyShadows, isLit: boolean): number[] {
  for (let i = isLit ? 0 : 1; i <= KEYS; i++) keys.offer(100 + i, i, ROWS.subarray(i * ROW, (i + 1) * ROW));
  keys.update(ROWS, new Float32Array((KEYS + 1) * 4), 1);
  const drawn: number[] = [];
  for (let slot = keys.next(); slot >= 0; slot = keys.next()) {
    keys.drawn(slot);
    drawn.push(slot);
  }
  return drawn;
}

describe('KeyShadows with more keys than maps', () => {
  it('keeps the map of a strobe in the best keys: the weaker key that fills its place in a dark frame waits', () => {
    const keys = new KeyShadows();
    expect(frame(keys, true)).toHaveLength(KEYS);
    const slot = keys.layerOf(STROBE);
    expect(slot).toBeGreaterThanOrEqual(0);
    for (let n = 0; n < 20; n++) {
      // each second frame is dark: no map changes hands and none is drawn again
      expect(frame(keys, n % 2 === 1)).toEqual([]);
      expect(keys.layerOf(STROBE)).toBe(slot);
      expect(keys.layerOf(WEAKEST)).toBe(-1);
    }
  });

  it('gives the slot of a key that is dark for longer than HOLD frames to the key that waits', () => {
    const keys = new KeyShadows();
    frame(keys, true);
    const slot = keys.layerOf(STROBE);
    for (let n = 0; n < HOLD; n++) frame(keys, false);
    expect([keys.layerOf(STROBE), keys.layerOf(WEAKEST)]).toEqual([slot, -1]);
    expect(frame(keys, false)).toEqual([slot]);
    expect([keys.layerOf(STROBE), keys.layerOf(WEAKEST)]).toEqual([-1, slot]);
  });
});
