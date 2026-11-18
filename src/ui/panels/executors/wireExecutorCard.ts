import type { Executor } from '../../../engine/Executor';
import { requireChild } from '../../dom';
import { bindFader } from '../../shared';
import type { ExecutorsDeps } from './ExecutorsDeps';

/** One card, the executor it plays and its 0-based index, handed to each wiring step. */
interface CardWiring {
  readonly card: HTMLElement;
  readonly exec: Executor;
  readonly index: number;
  readonly deps: ExecutorsDeps;
}

/** NAME, SEL, GO+ and GO-: STORE + name (or SEL) stores and still selects; STORE + GO+ selects without GO (Q13). */
function wireSelectAndStore({ card, exec, index, deps }: CardWiring): void {
  const { state, store, programmer, pool } = deps;
  const select = (): void => state.selectExec(index);
  const storeHere = (): void => programmer.storeCue(index, null);
  // quirk Q1 (orig:267): SEL is wired but hidden by CSS; quirk Q13 (orig:2157, 2160): STORE also selects, never GOes
  requireChild(card, '.ex-name').onclick = requireChild(card, '.ex-sel').onclick = () => {
    store.intercept(storeHere);
    select();
  };
  requireChild(card, '.b-go').onclick = () => {
    if (store.intercept(storeHere)) {
      select();
      return;
    }
    select();
    pool.go(exec, 1);
  };
  requireChild(card, '.b-back').onclick = () => {
    select();
    pool.go(exec, -1);
  };
}

/** FLASH: a press without cues does nothing; up or leave releases only a flash that is on (quirk Q14, orig:2163). */
function wireFlash({ card, exec, deps }: CardWiring): void {
  const flash = requireChild(card, '.b-flash');
  flash.onpointerdown = () => {
    if (!exec.cues.length) return;
    deps.pool.flashPress(exec);
    flash.classList.add('on');
  };
  const release = (): void => {
    if (!exec.flash) return;
    deps.pool.flashRelease(exec);
    flash.classList.remove('on');
  };
  flash.onpointerup = release;
  flash.onpointerleave = release;
}

/** The level fader: moving it ends a flash-only playback, so the release no longer turns the executor off. */
function wireFader({ card, exec, deps }: CardWiring): void {
  bindFader(
    requireChild(card, '.fader'),
    () => exec.level,
    (v) => {
      exec.flashOnly = false;
      deps.pool.setLevel(exec, v);
    },
  );
}

/**
 * Wires one card's controls: select and store, rename on a name double click, OFF (which keeps executor 1's fader,
 * quirk Q8, orig:2159), FLASH and the fader.
 */
export function wireExecutorCard(card: HTMLElement, exec: Executor, index: number, deps: ExecutorsDeps): void {
  const wiring: CardWiring = { card, exec, index, deps };
  wireSelectAndStore(wiring);
  requireChild(card, '.ex-name').ondblclick = () =>
    deps.modal.rename(`Executor ${index + 1}`, exec.name, (v) => {
      exec.name = v;
      deps.bus.emit('showChanged', undefined);
    });
  requireChild(card, '.ex-off').onclick = () => {
    exec.off();
    exec.level = index === 0 ? exec.level : 0; // quirk A12 (orig:2159)
  };
  wireFlash(wiring);
  wireFader(wiring);
}
