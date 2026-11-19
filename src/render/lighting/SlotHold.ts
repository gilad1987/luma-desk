/** Frames a slot stays held after its fixture stopped offering: a strobe at 6 flashes a second or faster keeps it. */
export const HOLD = 10;

/**
 * When a shadow map slot may change hands. With more key lights than maps, a strobe in the best keys is dark in
 * every second frame, and a weaker key fills its place in the offers of that frame: given the slot at once, the
 * strobe lost its map in each dark frame, was lit without a shadow and had its map drawn again in each lit one. So a
 * slot stays with its fixture for `HOLD` frames after its last offer, against a new key weaker than that offer.
 */
export class SlotHold {
  /** Per slot, the frame of its fixture's last offer and the score of that offer. */
  readonly #seen: Int32Array;
  readonly #scores: Float32Array;

  constructor(slots: number) {
    this.#seen = new Int32Array(slots);
    this.#scores = new Float32Array(slots);
  }

  /** Notes that the fixture of `slot` offered in `frame` with `score`. */
  keep(slot: number, frame: number, score: number): void {
    this.#seen[slot] = frame;
    this.#scores[slot] = score;
  }

  /**
   * The slot a new key with `score` takes in `frame`, of those whose fixture is no offer of this frame (`isOpen`):
   * the one whose hold ended, or else whose last offer was the weakest below `score`; -1 when every slot is held.
   */
  pick(score: number, frame: number, isOpen: (slot: number) => boolean): number {
    let best = -1;
    let bestScore = score;
    for (let slot = 0; slot < this.#seen.length; slot++) {
      if (!isOpen(slot)) continue;
      const held = frame - (this.#seen[slot] ?? 0) > HOLD ? -Infinity : (this.#scores[slot] ?? 0);
      if (held < bestScore) [best, bestScore] = [slot, held];
    }
    return best;
  }
}
