/**
 * Runs MVR loads (a picked file, the boot restore, Load demo rig) one after another. Two loads at the same time could
 * let an old `MvrStage.show` draw over the stage the user chose after it. `run` sets the new tail synchronously, so
 * `ready()` called right after a pick waits for that pick, which is what the e2e `mvrReady()` relies on.
 */
export class MvrLoadQueue {
  #latest: Promise<void> = Promise.resolve();
  readonly #onError: (error: unknown) => void;

  /** `onError` reports a failed load; the queue itself never rejects, so later loads still run. */
  constructor(onError: (error: unknown) => void) {
    this.#onError = onError;
  }

  /** Runs `load` after the latest load ended, with success or failure. */
  run(load: () => Promise<void>): void {
    this.#latest = this.#latest.then(load).catch(this.#onError);
  }

  /** Resolves after the latest load ended, with success or failure; resolved at once before the first load. */
  ready(): Promise<void> {
    return this.#latest;
  }
}
