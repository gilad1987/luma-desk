import { byId } from '../../ui/dom';

/**
 * The frame rate and the wall clock at the right of the top bar. Frames are counted every animation frame and shown
 * as an average on the slow tick, so the number is steady and costs no DOM write per frame.
 */
export class FpsClock {
  readonly #fps = byId('fps');
  readonly #clock = byId('clock');
  #seconds = 0;
  #frames = 0;

  /** Counts one rendered frame of `dt` seconds; the frame loop calls it right after `renderFrame`. */
  frame(dt: number): void {
    this.#seconds += dt;
    this.#frames++;
  }

  /** Shows the average rate since the last call and the time of day; the slow tick runs after the frame counted. */
  slow(): void {
    this.#fps.textContent = Math.round(this.#frames / this.#seconds) + ' fps';
    this.#seconds = 0;
    this.#frames = 0;
    this.#clock.textContent = new Date().toLocaleTimeString('en-GB');
  }
}
