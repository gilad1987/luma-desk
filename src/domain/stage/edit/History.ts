import type { StageDesign } from '../StageDesign';

/** Undo steps kept; older steps drop off, so a long session cannot grow memory without limit. */
export const HISTORY_CAP = 200;

/**
 * The builder's undo/redo stack. It keeps whole designs, not diffs: designs are readonly and an edit shares the parts
 * it does not change, so a step is cheap and undo can never drift from what the edit ops did. It does not apply a
 * design to the rig; the caller applies what `undo` and `redo` return.
 */
export class History {
  #past: StageDesign[] = [];
  #future: StageDesign[] = [];
  #current: StageDesign;

  constructor(initial: StageDesign) {
    this.#current = initial;
  }

  /** The design the user sees now. */
  get current(): StageDesign {
    return this.#current;
  }

  /** True when `undo` has a step to go back to (the Undo button state). */
  get canUndo(): boolean {
    return this.#past.length > 0;
  }

  /** True when `redo` has a step to go forward to (the Redo button state). */
  get canRedo(): boolean {
    return this.#future.length > 0;
  }

  /**
   * Records an edit result as the current design and clears redo, as every editor does after a new edit. An op that
   * changed nothing returns the same object, which adds no step.
   */
  push(next: StageDesign): void {
    if (next === this.#current) return;
    this.#past.push(this.#current);
    if (this.#past.length > HISTORY_CAP) this.#past.shift();
    this.#future = [];
    this.#current = next;
  }

  /** Steps back one edit and returns the design to apply, or `undefined` when there is nothing to undo. */
  undo(): StageDesign | undefined {
    const previous = this.#past.pop();
    if (!previous) return undefined;
    this.#future.push(this.#current);
    this.#current = previous;
    return previous;
  }

  /** Steps forward one undone edit and returns the design to apply, or `undefined` when there is nothing to redo. */
  redo(): StageDesign | undefined {
    const following = this.#future.pop();
    if (!following) return undefined;
    this.#past.push(this.#current);
    this.#current = following;
    return following;
  }
}
