import { byId } from '../../ui/dom';

/**
 * The top bar's `#fps` and `#clock`. The frame loop counts every frame here; the slow tick prints the average over
 * the frames since the last print, so a dirty UI (which runs the slow tick early) gives a shorter window.
 */
export class FpsClockReadout {
  readonly #fps = byId('fps');
  readonly #clock = byId('clock');
  #seconds = 0;
  #frames = 0;

  /** Counts one frame of `dt` seconds. */
  frame(dt: number): void {
    this.#seconds += dt;
    this.#frames++;
  }

  /** Slow-tick callback: prints the frame rate, restarts the count and prints the wall-clock time. */
  slow(): void {
    this.#fps.textContent = `${Math.round(this.#frames / this.#seconds)} fps`;
    this.#seconds = 0;
    this.#frames = 0;
    this.#clock.textContent = new Date().toLocaleTimeString('en-GB');
  }
}
