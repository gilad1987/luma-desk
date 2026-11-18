/** The fast tick runs when more than this many ms passed since the last one: live readouts and faders. */
const FAST_MS = 50;
/** The slow tick runs when more than this many ms passed, or at once on the next frame when the UI is dirty. */
const SLOW_MS = 400;

/**
 * Throttles the DOM work of the frame loop: the render runs every frame, the panels repaint on two slower clocks.
 * Callbacks run in registration order, so the composition root registers them in the legacy order. The UI starts
 * dirty, so the first frame runs the slow tick.
 */
export class UiTickScheduler {
  readonly #fast: ((now: number) => void)[] = [];
  readonly #slow: (() => void)[] = [];
  #fastAt = 0;
  #slowAt = 0;
  #dirty = true;

  /** Adds a fast-tick callback; it gets the frame time in seconds. */
  onFast(callback: (now: number) => void): void {
    this.#fast.push(callback);
  }

  /** Adds a slow-tick callback. */
  onSlow(callback: () => void): void {
    this.#slow.push(callback);
  }

  /** Forces the slow tick on the next frame (not now), as the engine's `stateDirty` event did before. */
  markDirty(): void {
    this.#dirty = true;
  }

  /**
   * Runs the ticks that are due at frame time `t` (ms, the requestAnimationFrame stamp); `now` is `t` in seconds.
   * The dirty flag clears after the slow callbacks, so a callback that marks the UI dirty does not repeat itself.
   */
  tick(t: number, now: number): void {
    if (t - this.#fastAt > FAST_MS) {
      this.#fastAt = t;
      for (const callback of this.#fast) callback(now);
    }
    if (t - this.#slowAt > SLOW_MS || this.#dirty) {
      this.#slowAt = t;
      for (const callback of this.#slow) callback();
      this.#dirty = false;
    }
  }
}
