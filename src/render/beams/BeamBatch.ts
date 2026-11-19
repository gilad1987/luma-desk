import { ROW } from './packBeam';

/**
 * The scene object that stands for one beam: the cone mesh of the fixture. The fixture sync sets `visible` for
 * every fixture in every frame, so it is the lit flag (a strobe gate is a hard on or off, with no memory), and
 * `parent` is null once the fixture left the stage.
 */
export interface BeamCarrier {
  readonly visible: boolean;
  readonly parent: unknown;
}

/**
 * The beams of the current frame as instance rows, one per carrier. The fixture sync writes the row of each lit
 * fixture; the pass copies the rows of the lit carriers to the GPU buffer. A row lives as long as its carrier, so a
 * frame allocates nothing.
 */
export class BeamBatch {
  /** The HAZE control, 0..1, as the fixture sync last saw it. */
  haze = 0;
  /** The haze clock in seconds. */
  time = 0;
  readonly #rows = new Map<BeamCarrier, Float32Array>();
  #out: Float32Array = new Float32Array(0);
  #count = 0;
  /** One function for every frame, so a flush allocates nothing (a `for...of` makes an entry array per row). */
  readonly #copy = (row: Float32Array, carrier: BeamCarrier): void => {
    if (carrier.parent === null) this.#rows.delete(carrier);
    else if (carrier.visible && (this.#count + 1) * ROW <= this.#out.length) this.#out.set(row, this.#count++ * ROW);
  };

  /** The number of carriers that ever lit and are still on the stage. */
  get size(): number {
    return this.#rows.size;
  }

  /** The row of a carrier, created on its first lit frame. */
  row(carrier: BeamCarrier): Float32Array {
    let row = this.#rows.get(carrier);
    if (!row) {
      row = new Float32Array(ROW);
      this.#rows.set(carrier, row);
    }
    return row;
  }

  /**
   * Copies the rows of the lit carriers to `out`, packed from the start, and returns how many. Carriers that left
   * the scene are dropped. `out` must hold `size` rows; rows past its end are not written.
   */
  flush(out: Float32Array): number {
    this.#out = out;
    this.#count = 0;
    this.#rows.forEach(this.#copy);
    return this.#count;
  }
}
