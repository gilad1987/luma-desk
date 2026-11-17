import { clamp, type Clock } from '../../../core';
import type { Executor } from '../../../engine/Executor';
import { byId } from '../../dom';
import { autoHudText, executorHudText, type CueHudText } from './cueHudText';
import type { ExecutorsDeps } from './ExecutorsDeps';

/** Beats in a bar: the bar progress counts bars of four beats. */
const BEATS_PER_BAR = 4;

/**
 * The bar width for executor `exec`: the fade's progress (frozen at `pausedAt` while paused), else full while it is on
 * without a fade, else '0'. Every pause sets `pausedAt`; NaN (an ignored width) is what the old code wrote if it were
 * ever missing.
 */
function fadeBarWidth(exec: Executor, clock: Clock): string {
  const fade = exec.fade;
  if (!fade) return exec.on ? '100%' : '0';
  const elapsed = fade.paused ? (fade.pausedAt ?? NaN) : clock.nowSeconds() - fade.t0;
  return clamp(elapsed / (fade.dur || 1), 0, 1) * 100 + '%';
}

/**
 * The cue HUD over the viewer (`#cueHud`): the selected executor's cue, the next cue and a fade progress bar, or the
 * Auto Show's style, section and bar progress while it runs.
 */
export class CueHud {
  readonly #deps: ExecutorsDeps;
  readonly #exec = byId('hudExec');
  readonly #cue = byId('hudCue');
  readonly #next = byId('hudNext');
  readonly #bar = byId('hudBar');

  constructor(deps: ExecutorsDeps) {
    this.#deps = deps;
  }

  /** Repaints for the selected executor `e` (0-based `i`). */
  paint(e: Executor, i: number): void {
    const { autoShow, tempo, clock } = this.#deps;
    this.#write(executorHudText(e, i));
    if (autoShow.on) {
      const bars = autoShow.barsPerLook(),
        barsDone = ((clock.nowSeconds() - tempo.beatOrigin) * tempo.bpm) / (60 * BEATS_PER_BAR);
      this.#write(autoHudText(autoShow, tempo.bpm, bars));
      this.#bar.style.width = ((((barsDone % bars) + bars) % bars) / bars) * 100 + '%';
      return;
    }
    this.#bar.style.width = fadeBarWidth(e, clock);
  }

  #write(text: CueHudText): void {
    this.#exec.textContent = text.exec;
    this.#cue.innerHTML = text.cueHtml;
    this.#next.textContent = text.next;
  }
}
