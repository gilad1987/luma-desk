import type { AppState } from '../../engine/AppState';

/** The command that arms store mode instead of running: `store` alone, in any case, with any spaces around it. */
const STORE_COMMAND = /^\s*store\s*$/i;

/**
 * The UI's view of store mode. The flag lives in `AppState` (the engine announces each change on the bus), so this
 * class holds no state of its own; it removes the "if storing: store, leave store mode" block the pools, executors,
 * sequence rows and the keypad each repeated.
 */
export class StoreModeGuard {
  readonly #state: AppState;

  constructor(state: AppState) {
    this.#state = state;
  }

  /** True while the next click on a slot, executor or cue records instead of playing. */
  get active(): boolean {
    return this.#state.storeMode;
  }

  /** Turns store mode on or off through the engine, which updates the view and logs the prompt. */
  set(on: boolean): void {
    this.#state.setStoreMode(on);
  }

  /**
   * In store mode, runs `store` and leaves store mode, then returns true. Only that part is shared: what a caller
   * does afterwards differs (the executor name still selects, GO+ selects without GO, slots just return).
   */
  intercept(store: () => void): boolean {
    if (!this.#state.storeMode) return false;
    store();
    this.#state.setStoreMode(false);
    return true;
  }

  /**
   * Arms store mode when `command` is the bare `store` command; the caller then clears its input instead of running.
   */
  takeStoreCommand(command: string): boolean {
    if (!STORE_COMMAND.test(command)) return false;
    this.#state.setStoreMode(true);
    return true;
  }
}
