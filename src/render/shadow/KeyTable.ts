import { hashKey, KEY, nearKey, sameKey, storeKey } from './tileKey';

/** Slots after its home slot where a row may stand. */
const WINDOW = 8;

/**
 * A fixed table of beam row keys (see `tileKey.ts`): what a caller knows about a row lives in its own arrays at the
 * row's slot. Beams have no identity from frame to frame, so the row is the key. A row stands in one of a few slots
 * after its hash; a new row takes the slot of that window that was unused for longest. A frame allocates nothing.
 */
export class KeyTable {
  readonly slots: number;
  readonly #keys: Uint32Array;
  /** The tick each slot was last used at; 0 while it is empty. */
  readonly #used: Uint32Array;

  constructor(slots: number) {
    this.slots = slots;
    this.#keys = new Uint32Array(slots * KEY);
    this.#used = new Uint32Array(slots);
  }

  /** The slot of the row that starts at word `row`, or -1; the slot counts as used at `tick` (above 0). */
  find(words: Uint32Array, row: number, tick: number): number {
    const home = hashKey(words, row) % this.slots;
    for (let step = 0; step < WINDOW; step++) {
      const slot = (home + step) % this.slots;
      if (this.#used[slot] === 0 || !sameKey(words, row, this.#keys, slot)) continue;
      this.#used[slot] = tick;
      return slot;
    }
    return -1;
  }

  /** True when the row is at most one small step from the row that stands in `slot` (see `nearKey`). */
  near(words: Uint32Array, row: number, slot: number): boolean {
    return nearKey(words, row, this.#keys, slot);
  }

  /** Gives a row that `find` did not find a slot, or -1 when every slot of its window was used at this `tick`. */
  claim(words: Uint32Array, row: number, tick: number): number {
    const home = hashKey(words, row) % this.slots;
    let oldest = home;
    for (let step = 1; step < WINDOW; step++) {
      const slot = (home + step) % this.slots;
      if ((this.#used[slot] ?? 0) < (this.#used[oldest] ?? 0)) oldest = slot;
    }
    if (this.#used[oldest] === tick) return -1;
    storeKey(words, row, this.#keys, oldest);
    this.#used[oldest] = tick;
    return oldest;
  }
}
