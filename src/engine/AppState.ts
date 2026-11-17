import type { EngineBus } from './events';

/** The prompt shown when store mode turns on, so the operator knows the next click records instead of plays. */
const STORE_PROMPT = 'STORE — click an executor, cue, group or preset slot (or type)';

/**
 * The desk's global switches and modes. A plain holder: the frame loop, the output merge and the UI read the fields
 * directly. Fields whose change needs no announcement today are plain fields; a TS `set` accessor can add one later
 * without touching a call site. Only store mode and the selected executor go through setters, because their change
 * must reach the UI at once.
 */
export class AppState {
  /** Grand master, 0..1; scales every dimmer last, after blackout. */
  gm = 1;
  /** Blackout kills all dimmers, highlight included. */
  blackout = false;
  /** Highlight drives the selected fixtures to open white at full. */
  highlight = false;
  /** Fan mode makes the position encoders spread values across the selection. */
  fanMode = false;
  /** Haze density, 0..1. It lives here, not in the renderer, because the show file saves it. */
  haze = 0.62;
  /** `performance.now()` of the last CLEAR press, so a second press within 400 ms becomes Clear All. */
  lastClear = 0;
  #storeMode = false;
  #selExec = 0;
  readonly #bus: EngineBus;

  constructor(bus: EngineBus) {
    this.#bus = bus;
  }

  /** Whether the next pool or executor click records instead of plays. */
  get storeMode(): boolean {
    return this.#storeMode;
  }

  /** The executor index (0-based) that GO, Pause, Off and cue commands act on. */
  get selExec(): number {
    return this.#selExec;
  }

  /** Turns store mode on or off; when it turns on, the operator is told what to click next. */
  setStoreMode(on: boolean): void {
    this.#storeMode = on;
    this.#bus.emit('storeModeChanged', { on });
    if (on) this.#bus.emit('message', { kind: 'log', text: STORE_PROMPT, level: '' });
  }

  /** Makes executor `index` the target of playback commands; callers clamp it, as they did before. */
  selectExec(index: number): void {
    this.#selExec = index;
    this.#bus.emit('stateDirty', undefined);
  }
}
