/** Stops a scheduled run before it fires. */
export type CancelRun = () => void;

/** Runs `run` once after `ms` milliseconds. Injected, so a test can drive time without a real clock (T15). */
export type Schedule = (run: () => void, ms: number) => CancelRun;

/** The browser timer as a `Schedule`. */
export const timerSchedule: Schedule = (run, ms) => {
  const handle = setTimeout(run, ms);
  return () => clearTimeout(handle);
};

/**
 * Runs only the last of the requests made within `ms` of each other. The builder previews through it, so a burst of
 * edits (a drag, a typed number) rebuilds the rig once, and always from a timer, never from inside an event emit.
 */
export class Debounce {
  readonly #schedule: Schedule;
  readonly #ms: number;
  #cancel: CancelRun | null = null;

  constructor(schedule: Schedule, ms: number) {
    this.#schedule = schedule;
    this.#ms = ms;
  }

  /** Replaces any waiting run with `run`, which fires `ms` after this call. */
  request(run: () => void): void {
    this.cancel();
    this.#cancel = this.#schedule(() => {
      this.#cancel = null;
      run();
    }, this.#ms);
  }

  /** Drops the waiting run, if any. */
  cancel(): void {
    this.#cancel?.();
    this.#cancel = null;
  }
}
