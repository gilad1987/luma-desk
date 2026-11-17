/** The value span an encoder covers, and the whole-number step of a stepped attribute (gobo). */
export interface EncoderRange {
  readonly label: string;
  readonly min: number;
  readonly max: number;
  readonly step?: number;
}

/** A full knob throw: dragging this many pixels sweeps the whole range. */
const DRAG_PX = 320;
/** Wheel notches per full range on a continuous attribute. */
const WHEEL_NOTCHES = 100;
/** Shift turns any knob gesture into a fine adjustment. */
const fineScale = (fine: boolean): number => (fine ? 0.1 : 1);

/**
 * Turns knob gestures into value deltas. A stepped attribute collects the fractions of a drag until they make a
 * whole step, so a slow drag still moves the gobo wheel; the wheel always moves a stepped attribute by one step.
 */
export class EncoderTurn {
  readonly #range: EncoderRange;
  readonly #emit: (delta: number) => void;
  #remainder = 0;

  constructor(range: EncoderRange, emit: (delta: number) => void) {
    this.#range = range;
    this.#emit = emit;
  }

  /** Forgets the collected fraction; each new drag starts from zero. */
  reset(): void {
    this.#remainder = 0;
  }

  /** A vertical drag of `dy` pixels, positive upwards. */
  drag(dy: number, fine: boolean): void {
    const { min, max } = this.#range;
    this.#turn(((dy * (max - min)) / DRAG_PX) * fineScale(fine));
  }

  /** One wheel event; only the sign of `deltaY` counts (wheel down turns down). */
  wheel(deltaY: number, fine: boolean): void {
    const { min, max, step } = this.#range;
    const s = -Math.sign(deltaY);
    if (step) this.#emit(s * step);
    else this.#emit(((s * (max - min)) / WHEEL_NOTCHES) * fineScale(fine));
  }

  #turn(v: number): void {
    const step = this.#range.step;
    if (!step) {
      this.#emit(v);
      return;
    }
    this.#remainder += v;
    const n = Math.trunc(this.#remainder / step) * step;
    if (n) {
      this.#remainder -= n;
      this.#emit(n);
    }
  }
}
