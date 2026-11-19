import { ROW } from '../beams/packBeam';
import { KeyOffers } from './KeyOffers';
import { EXTRA } from './LightBatch';
import type { ShadowLayers } from './ShadowSource';
import { SlotHold } from './SlotHold';

/** Shadow maps that exist at one time: one per key light. */
export const KEYS = 8;
/** Frames between two age draws: each map is at most `TURN * KEYS` frames old (4 s at 60 frames per second). */
export const TURN = 30;
/** The slots of a beam row its map is drawn from: lens centre, axis, field angle and lens radius (3 is the length). */
const POSE = [0, 1, 2, 4, 5, 6, 7, 14] as const;

/**
 * Which fixtures have a shadow map, by fixture id, and which maps are out of date. The best `KEYS` offers of a frame
 * hold a slot each. A fixture that goes dark keeps its slot and its map for `HOLD` frames against a weaker new key
 * (`SlotHold`), and after that while no new key needs the slot: a strobe that is dark for a few frames loses nothing,
 * also when a weaker key fills its place in the offers of a dark frame. A lit fixture that is outranked holds nothing:
 * the key that passed it takes its slot at once. A map is drawn again when the pose of its key changed, when the
 * scene moved (`stamp`: every map then, as any map may hold the mover), and by age.
 */
export class KeyShadows implements ShadowLayers {
  /** Per slot, the row its map is drawn from next. */
  readonly poses = new Float32Array(KEYS * ROW);
  readonly #ids = new Int32Array(KEYS).fill(-1);
  readonly #hasMap = new Uint8Array(KEYS);
  readonly #isDirty = new Uint8Array(KEYS);
  readonly #hold = new SlotHold(KEYS);
  readonly #offers = new KeyOffers(KEYS);
  #cursor = 0;
  #frame = 0;
  #stamp = Number.NaN;

  layerOf(fixtureId: number): number {
    const slot = this.#ids.indexOf(fixtureId);
    return slot >= 0 && this.#hasMap[slot] === 1 ? slot : -1;
  }

  /** Keeps the offer when it is one of the best of this frame, and notes a lit key's slot, which then holds nothing. */
  offer(fixtureId: number, index: number, row: Float32Array): void {
    const slot = this.#offers.offer(fixtureId, index, row) > 0 ? this.#ids.indexOf(fixtureId) : -1;
    if (slot >= 0) this.#hold.lit(slot, this.#frame);
  }

  /**
   * Ends the offers of a frame: gives slots to new keys and marks the maps that `rows` or new scenery outdate. It
   * then writes the layer of each key to its row of `extras`, after the slots are given: a fixture that lost its
   * slot in this frame, waits for one, or whose first map is not drawn, reads no map, never one of another fixture.
   */
  update(rows: Float32Array, extras: Float32Array, stamp: number): void {
    for (let i = 0; i < this.#offers.count; i++) {
      const slot = this.#slotFor(this.#offers.idAt(i), this.#offers.scoreAt(i));
      const index = this.#offers.rowAt(i);
      extras[index * EXTRA] = slot >= 0 && this.#hasMap[slot] === 1 ? slot : -1;
      if (slot < 0) continue;
      this.#hold.keep(slot, this.#frame, this.#offers.scoreAt(i));
      const from = index * ROW;
      const to = slot * ROW;
      for (const k of POSE) if (this.poses[to + k] !== rows[from + k]) this.#isDirty[slot] = 1;
      for (let k = 0; k < ROW; k++) this.poses[to + k] = rows[from + k] ?? 0;
    }
    if (stamp !== this.#stamp) this.#isDirty.fill(1);
    this.#stamp = stamp;
    // what no stamp shows (the audience sways in its vertex shader): one map in turn is drawn again
    if (++this.#frame % TURN === 0) this.#isDirty[(this.#frame / TURN) % KEYS] = 1;
    this.#offers.endFrame();
  }

  /** The next out-of-date slot, in turn, so moving keys share the draws; -1 when none is. A peek keeps the turn. */
  next(isPeek = false): number {
    for (let k = 0; k < KEYS; k++) {
      const slot = (this.#cursor + k) % KEYS;
      if (this.#isDirty[slot] !== 1 || (this.#ids[slot] ?? -1) < 0) continue;
      if (!isPeek) this.#cursor = slot + 1;
      return slot;
    }
    return -1;
  }

  /** Records that the map of `slot` was drawn from its pose. */
  drawn(slot: number): void {
    this.#isDirty[slot] = 0;
    this.#hasMap[slot] = 1;
  }

  /** The slot of `id`; else an empty one, or one that `SlotHold` lets a new key of `score` take; -1 when none is. */
  #slotFor(id: number, score: number): number {
    let slot = this.#ids.indexOf(id);
    if (slot >= 0) return slot;
    slot = this.#ids.indexOf(-1);
    if (slot < 0) slot = this.#hold.pick(score, this.#frame, (k) => !this.#offers.has(this.#ids[k] ?? -1));
    if (slot < 0) return slot;
    this.#ids[slot] = id;
    this.#hasMap[slot] = 0;
    this.#isDirty[slot] = 1;
    return slot;
  }
}
