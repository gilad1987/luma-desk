import { keyScore } from './keyScore';

/** The best offers of one frame for a shadow map, best first: at most as many as there are maps. */
export class KeyOffers {
  count = 0;
  readonly capacity: number;
  readonly #ids: Int32Array;
  readonly #rows: Int32Array;
  readonly #scores: Float32Array;
  /**
   * The floor of the stage: the lowest landing of the frame before, world y. No stage design names the deck of an
   * imported stage, and the beams of a rig find it: the lowest of them land on the floor the figures stand on.
   * It starts at world y 0, so the first frame of a stage on a platform scores as it did before.
   */
  #floor = 0;
  #lowest = Infinity;

  constructor(capacity: number) {
    this.capacity = capacity;
    this.#ids = new Int32Array(capacity);
    this.#rows = new Int32Array(capacity);
    this.#scores = new Float32Array(capacity);
  }

  /** Keeps the offer when it is one of the best of this frame. */
  offer(fixtureId: number, index: number, row: Float32Array): void {
    const last = this.capacity - 1;
    const landing = (row[1] ?? 0) + (row[5] ?? 0) * (row[3] ?? 0);
    if ((row[15] ?? 1) <= 0.5 && landing < this.#lowest) this.#lowest = landing;
    const score = keyScore(row, this.#floor);
    if (score <= 0 || (this.count === this.capacity && score <= (this.#scores[last] ?? 0))) return;
    let at = this.count === this.capacity ? last : this.count++;
    for (; at > 0 && (this.#scores[at - 1] ?? 0) < score; at--) {
      this.#ids[at] = this.#ids[at - 1] ?? -1;
      this.#rows[at] = this.#rows[at - 1] ?? 0;
      this.#scores[at] = this.#scores[at - 1] ?? 0;
    }
    this.#ids[at] = fixtureId;
    this.#rows[at] = index;
    this.#scores[at] = score;
  }

  /** Ends the offers of a frame; the lowest landing of it, if a beam landed, is the floor of the next frame. */
  endFrame(): void {
    this.count = 0;
    if (this.#lowest < Infinity) this.#floor = this.#lowest;
    this.#lowest = Infinity;
  }

  /** The fixture of offer `i`. */
  idAt(i: number): number {
    return this.#ids[i] ?? -1;
  }

  /** The index of the packed row of offer `i`. */
  rowAt(i: number): number {
    return this.#rows[i] ?? 0;
  }

  has(fixtureId: number): boolean {
    for (let i = 0; i < this.count; i++) if (this.#ids[i] === fixtureId) return true;
    return false;
  }
}
