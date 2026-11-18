import type { Clock } from '../core';
import { cueAt, stepCueIndex, type Cue } from './CueList';
import { Executor } from './Executor';
import type { EngineBus } from './events';
import { stepFade } from './Fade';

/** How many executors the desk has, one per fader on the panel and MIDI controller. */
const EXECUTOR_COUNT = 10;

/**
 * The desk's executors and the operator actions on them: GO, the faders and the flash buttons. Actions live here, not
 * on {@link Executor}, because they report to the operator and the report names the executor by its number.
 */
export class ExecutorPool {
  /** The operator's executors, numbered 1-10 on the desk; the array identity is fixed for the session. */
  readonly execs: readonly Executor[];
  /** The executor the auto-show plays its looks on; it has no fader, and its level follows the auto-show. */
  readonly autoExec: Executor;
  /** Every executor in output-merge order: the operator's, then the auto-show's. */
  readonly all: readonly Executor[];
  readonly #clock: Clock;
  readonly #bus: EngineBus;

  constructor(clock: Clock, bus: EngineBus) {
    this.#clock = clock;
    this.#bus = bus;
    this.execs = Array.from({ length: EXECUTOR_COUNT }, () => new Executor(false, clock));
    this.autoExec = new Executor(true, clock);
    this.autoExec.name = 'AUTO';
    this.all = [...this.execs, this.autoExec];
  }

  /**
   * GO (`dir` 1) or GO back (-1). A paused fade only resumes. Otherwise the executor steps to the next cue, wrapping at
   * both ends, and a stopped executor with its fader at 0 is raised to full so the GO is visible.
   */
  go(e: Executor, dir: 1 | -1 = 1): void {
    if (!e.cues.length) {
      this.#bus.emit('message', { kind: 'toast', text: 'Executor is empty — STORE a cue first' });
      return;
    }
    if (e.resume()) return;
    if (!e.on && e.level === 0) e.level = 1;
    const n = stepCueIndex(e.cues, e.cur, dir);
    e.goto(n);
    const cue = cueAt(e.cues, n);
    // the auto executor is not in `execs` and would print "Exec 0"; no caller passes it
    const text = `Exec ${this.execs.indexOf(e) + 1}: Cue ${cue.num} ${cue.name}`;
    this.#bus.emit('message', { kind: 'log', text, level: 'ok' });
  }

  /**
   * Moves the fader of `e` to `v` (0-1). Raising a stopped executor starts it at its current cue, or the first; pulling
   * it to 0 stops it unless its flash button is held.
   */
  setLevel(e: Executor, v: number): void {
    const was = e.level;
    e.level = v;
    if (v > 0 && !e.on && e.cues.length) e.goto(Math.max(0, e.cur));
    if (v === 0 && was > 0 && !e.flash) e.off();
  }

  /**
   * Presses the flash button of `e`: full level while held and the newest executor for LTP. A stopped executor snaps
   * to its cue with no fade and remembers that the flash started it. Does nothing on an executor without cues.
   */
  flashPress(e: Executor): void {
    if (!e.cues.length) return;
    e.flash = true;
    if (!e.on) {
      e.flashOnly = true;
      e.goto(Math.max(0, e.cur), 0);
    }
    e.lastGo = this.#clock.nowSeconds();
  }

  /** Releases the flash button of `e`; an executor the flash started, with its fader at 0, stops again. */
  flashRelease(e: Executor): void {
    if (!e.flash) return;
    e.flash = false;
    if (e.flashOnly && e.level === 0) e.off();
    e.flashOnly = false;
  }

  /**
   * Calls `fn` with the executor's 0-based place in `all` whenever it starts a cue (GO, fader, flash, `goto`), so the
   * missing-fixture notice can warn once per executor and cue. A later call replaces the observer.
   */
  observeCues(fn: (execIndex: number, cue: Cue) => void): void {
    this.all.forEach((e, i) => {
      e.onCue = (cue): void => fn(i, cue);
    });
  }

  /** Advances every running fade to frame time `now` (seconds from the render loop, not the executor clock). */
  stepFades(now: number): void {
    for (const e of this.all) stepFade(e, now);
  }
}
