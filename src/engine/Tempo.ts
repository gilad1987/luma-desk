import { clamp } from '../core';

/** Taps older than this (ms) no longer count, so a pause starts a fresh tempo. */
const TAP_WINDOW_MS = 2500;
const MIN_BPM = 40; // quirk E8 (orig:2249): slow taps reach this floor
const MAX_BPM = 220;

/**
 * The show tempo. Phasers and the auto-show read the beat as `(now - beatOrigin) * bpm / 60`, so both values are
 * needed and each can change alone: tap tempo sets both, song sync sets both, the auto-show re-anchors only the origin.
 */
export class Tempo {
  #bpm = 120;
  #beatOrigin = 0;
  #taps: number[] = [];

  /** Beats per minute. */
  get bpm(): number {
    return this.#bpm;
  }

  /** The time, in seconds, of a downbeat; beat phase is measured from it. */
  get beatOrigin(): number {
    return this.#beatOrigin;
  }

  /** Sets the tempo as given; show files, the demo and song sync pass already-valid values. */
  setBpm(bpm: number): void {
    this.#bpm = bpm;
  }

  /** Re-anchors the beat so the next downbeat lands on `seconds`. */
  setBeatOrigin(seconds: number): void {
    this.#beatOrigin = seconds;
  }

  /**
   * One tap of the TAP key at `nowMs` (`performance.now()`). Every tap moves the downbeat to now; from the second tap
   * in the window, the tempo becomes the mean tap interval, rounded and kept within 40..220 BPM.
   */
  tap(nowMs: number): void {
    this.#taps = this.#taps.filter((x) => nowMs - x < TAP_WINDOW_MS); // quirk Q16 (orig:2249)
    this.#taps.push(nowMs);
    this.#beatOrigin = nowMs / 1000;
    const first = this.#taps[0];
    if (this.#taps.length >= 2 && first !== undefined) {
      // the last tap is this one, so the span is now - first
      const interval = (nowMs - first) / (this.#taps.length - 1);
      this.#bpm = clamp(Math.round(60000 / interval), MIN_BPM, MAX_BPM);
    }
  }
}
