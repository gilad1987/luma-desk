import type { Executor } from '../../../engine/Executor';
import { byId } from '../../dom';
import { bindFader, paintFader } from '../../shared';
import type { ExecutorsDeps } from './ExecutorsDeps';

/**
 * The master section (`#master`): big GO/BACK, PAUSE, OFF on the selected executor, blackout, tap tempo and the Grand
 * Master fader. Its keys act on the executor selected at click time.
 */
export class MasterSection {
  readonly #deps: ExecutorsDeps;
  readonly #selName = byId('mSelName');
  readonly #pause = byId('pauseBtn');
  readonly #blackout = byId('boBtn');
  readonly #bpm = byId('bpmBox');
  readonly #gmValue = byId('gmVal');
  readonly #gmFader = byId('gmFader');

  constructor(deps: ExecutorsDeps) {
    this.#deps = deps;
    const { state, pool, tempo, clock } = deps;
    bindFader(
      this.#gmFader,
      () => state.gm,
      (v) => (state.gm = v),
    );
    const selected = (): Executor | undefined => pool.execs[state.selExec];
    const go = (dir: 1 | -1) => (): void => {
      const e = selected();
      if (e) pool.go(e, dir);
    };
    byId('goBig').onclick = go(1);
    byId('goBack').onclick = go(-1);
    this.#pause.onclick = () => selected()?.pause();
    byId('offBtn').onclick = () => selected()?.off();
    this.#blackout.onclick = () => {
      state.blackout = !state.blackout;
    };
    byId('tapBtn').onclick = () => tempo.tap(clock.nowMs());
  }

  /** Shows the selected executor `e` (0-based `i`) by number and name. */
  paintSelected(e: Executor, i: number): void {
    this.#selName.textContent = `${i + 1} ${e.name || ''}`;
  }

  /** Lights PAUSE while the selected executor's fade is paused. */
  paintPause(e: Executor): void {
    this.#pause.classList.toggle('on', !!e.fade?.paused);
  }

  /** Repaints blackout, tempo and Grand Master from the engine (fast tick). */
  paintLevels(): void {
    const { state, tempo } = this.#deps;
    this.#blackout.classList.toggle('on', state.blackout);
    this.#bpm.textContent = tempo.bpm + ' BPM';
    this.#gmValue.textContent = String(Math.round(state.gm * 100));
    paintFader(this.#gmFader, state.gm);
  }
}
