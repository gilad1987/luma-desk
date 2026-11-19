import { ROW } from '../beams/packBeam';
import { KeyTable } from './KeyTable';
import type { ShadowConfig } from './shadowConfig';

const SLOTS = 4096;

/** When a light counts as moving and how long it must then rest; a window of 0 gives one rest time for all. */
export type MovingRule = Pick<ShadowConfig, 'moveWindow' | 'movingRestFrames'>;

/**
 * Tells which beams are at rest: those whose row (see `tileKey.ts`) was first seen some frames ago. A light that
 * moves has a new row in every frame and is never at rest; one that stops is at rest `frames` frames later. A light
 * that goes dark and comes back with the same row is still at rest: its row is kept until a new row needs the slot.
 *
 * A light that pans slowly in 8-bit DMX steps has a new row once in about 40 frames. With one rest time it was at
 * rest between the steps and not at each step, and its shadow went off and on at the step rate. So the tracker also
 * follows each beam instance. A light whose row changed twice within `moveWindow` frames is moving and must rest
 * `movingRestFrames` frames. A light at rest that takes one small step (`nearKey`) after it kept its row that long
 * stays at rest: its tile is then drawn again in place (`stepTiles.ts`). The instance of a light changes when a
 * light before it goes dark; the rows are then old ones, and a row that is old enough is at rest by either rule.
 */
export class RestTracker {
  /** Per beam instance of the last `observe`: 1 when its row is at rest. */
  readonly atRest: Uint8Array;
  readonly #table = new KeyTable(SLOTS);
  /** The frame each slot's row was first seen in. */
  readonly #since = new Uint32Array(SLOTS);
  /** Per beam instance: the slot of its last row plus 1, the frame its row last changed, and 1 while it is moving. */
  readonly #slots: Uint16Array;
  readonly #changed: Uint32Array;
  readonly #moving: Uint8Array;
  readonly #frames: number;
  readonly #rule: MovingRule;
  #frame = 0;

  /** A row is at rest once it is `frames` frames old; 0 makes every beam at rest at once. */
  constructor(maxLights: number, frames: number, rule: MovingRule = { moveWindow: 0, movingRestFrames: 0 }) {
    this.atRest = new Uint8Array(maxLights);
    this.#slots = new Uint16Array(maxLights);
    this.#changed = new Uint32Array(maxLights);
    this.#moving = new Uint8Array(maxLights);
    this.#frames = frames;
    this.#rule = rule;
  }

  /** Call once per frame with the bits of the first `count` rows (`rowWords`). */
  observe(words: Uint32Array, count: number): void {
    this.#frame += 1;
    for (let light = 0; light < count; light++) this.atRest[light] = this.#rests(words, light) ? 1 : 0;
  }

  #rests(words: Uint32Array, light: number): boolean {
    const frame = this.#frame;
    const { moveWindow, movingRestFrames } = this.#rule;
    const last = (this.#slots[light] ?? 0) - 1;
    const slot = this.#slot(words, light * ROW);
    const wasAtRest = this.atRest[light] === 1;
    this.#slots[light] = slot + 1;
    let step = wasAtRest;
    if (last >= 0 && slot !== last) {
      const before = this.#changed[light] ?? 0;
      const held = before > 0 ? frame - before : Infinity;
      step &&= moveWindow > 0 && held >= movingRestFrames && this.#table.near(words, light * ROW, last);
      this.#moving[light] = held < moveWindow ? 1 : 0;
      this.#changed[light] = frame;
    }
    const age = slot < 0 ? 0 : frame - (this.#since[slot] ?? frame);
    return step || age >= (this.#moving[light] === 1 ? movingRestFrames : this.#frames);
  }

  /** The slot of a row, which is noted as seen now; a new row gets a slot (-1 when the table has none for it). */
  #slot(words: Uint32Array, row: number): number {
    const frame = this.#frame;
    const known = this.#table.find(words, row, frame);
    if (known >= 0) return known;
    const slot = this.#table.claim(words, row, frame);
    if (slot >= 0) this.#since[slot] = frame;
    return slot;
  }
}
