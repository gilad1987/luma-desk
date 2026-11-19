/**
 * Frames a slot stays held after its fixture went dark, about 170 ms at 60 frames per second: a strobe of 6 flashes a
 * second or faster keeps it there. The hold counts frames, not time: at 120 or 144 frames per second it is 80 or 70 ms,
 * and a strobe dark for longer than that loses its map in each flash.
 */
export const HOLD = 10;

/**
 * When a shadow map slot may change hands. With more key lights than maps, a strobe in the best keys is dark for most
 * of each flash (a 22 % shutter at 6.5 Hz: about 7 of 9 frames), and a weaker key fills its place in the offers of a
 * dark frame: given the slot at once, the strobe lost its map in each flash, was lit without a shadow and had its map
 * drawn again. So a slot stays with its dark fixture for `HOLD` frames after its last offer, against a new key weaker
 * than that offer. A fixture that is lit but outranked (`lit`) holds nothing: its slot is open at once.
 */
export class SlotHold {
  /** Per slot, the frame of its fixture's last offer and the score of that offer, and the last frame it was lit. */
  readonly #seen: Int32Array;
  readonly #scores: Float32Array;
  readonly #lit: Int32Array;

  constructor(slots: number) {
    this.#seen = new Int32Array(slots);
    this.#scores = new Float32Array(slots);
    this.#lit = new Int32Array(slots).fill(-1);
  }

  /** Notes that the fixture of `slot` offered in `frame` with `score`. */
  keep(slot: number, frame: number, score: number): void {
    this.#seen[slot] = frame;
    this.#scores[slot] = score;
  }

  /** Notes that the fixture of `slot` is lit in `frame`, also when it is not one of the best offers. */
  lit(slot: number, frame: number): void {
    this.#lit[slot] = frame;
  }

  /**
   * The slot a new key with `score` takes in `frame`, of those whose fixture is no offer of this frame (`isOpen`):
   * one whose fixture is lit or whose hold ended, or else whose last offer was the weakest below `score`; -1 when
   * every slot is held.
   */
  pick(score: number, frame: number, isOpen: (slot: number) => boolean): number {
    let best = -1;
    let bestScore = score;
    for (let slot = 0; slot < this.#seen.length; slot++) {
      if (!isOpen(slot)) continue;
      const isFree = this.#lit[slot] === frame || frame - (this.#seen[slot] ?? 0) > HOLD;
      const held = isFree ? -Infinity : (this.#scores[slot] ?? 0);
      if (held < bestScore) [best, bestScore] = [slot, held];
    }
    return best;
  }
}
