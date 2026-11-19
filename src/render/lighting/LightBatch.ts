import type { BeamCarrier } from '../beams/BeamBatch';
import { ROW } from '../beams/packBeam';
import type { ShadowLayers } from './ShadowSource';

/** Floats per light next to its beam row: shadow layer, cosine of the incidence, and two spare. */
export const EXTRA = 4;

interface Entry {
  readonly fixtureId: number;
  /** The fixture's row in the beam batch: the same object, so the beam is packed once (`packBeam`). */
  readonly row: Float32Array;
  cosine: number;
}

/**
 * The lights of the current frame: for each beam carrier its beam row and what only the surface light needs. The
 * fixture sync offers every lit fixture; the pass packs the rows of the lit carriers for the GPU, each with its
 * extras at the same index. It keys its entries by carrier, as the beam batch does, and names the fixture, so a
 * shadow map belongs to a fixture id and never to a position.
 */
export class LightBatch {
  readonly #entries = new Map<BeamCarrier, Entry>();
  #rows: Float32Array = new Float32Array(0);
  #extras: Float32Array = new Float32Array(0);
  #shadows: ShadowLayers | undefined;
  #count = 0;

  /** The number of carriers that ever lit and are still on the stage. */
  get size(): number {
    return this.#entries.size;
  }

  /** `cosine` is |axis . normal| where the beam axis lands, or 0 when it lands on nothing. */
  offer(carrier: BeamCarrier, fixtureId: number, row: Float32Array, cosine: number): void {
    const entry = this.#entries.get(carrier);
    if (entry?.row === row) entry.cosine = cosine;
    else this.#entries.set(carrier, { fixtureId, row, cosine });
  }

  /**
   * Copies the rows of the lit carriers to `rows` and their extras to `extras`, packed from the start, and returns
   * how many. Carriers that left the scene are dropped. Each lit row is offered to `shadows` as a key light.
   */
  flush(rows: Float32Array, extras: Float32Array, shadows: ShadowLayers): number {
    this.#rows = rows;
    this.#extras = extras;
    this.#shadows = shadows;
    this.#count = 0;
    // `forEach` with a kept function: a `for of` over a map makes an array per entry, every frame
    this.#entries.forEach(this.#pack);
    this.#shadows = undefined;
    return this.#count;
  }

  readonly #pack = (entry: Entry, carrier: BeamCarrier): void => {
    const rows = this.#rows;
    const count = this.#count;
    if (carrier.parent === null) this.#entries.delete(carrier);
    else if (carrier.visible && (count + 1) * ROW <= rows.length) {
      rows.set(entry.row, count * ROW);
      // no map yet: the shadows name the layers of this frame's keys once every row is offered
      this.#extras[count * EXTRA] = -1;
      this.#extras[count * EXTRA + 1] = entry.cosine;
      this.#shadows?.offer(entry.fixtureId, count, entry.row);
      this.#count = count + 1;
    }
  };
}
