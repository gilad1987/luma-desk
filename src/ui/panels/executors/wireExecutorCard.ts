import type { Executor } from '../../../engine/Executor';
import { requireChild } from '../../dom';
import { bindFader } from '../../shared';
import type { ExecutorsDeps } from './ExecutorsDeps';

/**
 * Wires one card's controls. STORE + name (or SEL) stores and still selects; STORE + GO+ stores and selects but does
 * not GO (quirk Q13). OFF keeps executor 1's fader (quirk Q8). FLASH releases on up or leave (quirk Q14).
 */
export function wireExecutorCard(card: HTMLElement, e: Executor, i: number, deps: ExecutorsDeps): void {
  const { state, store, programmer, pool, modal, bus } = deps;
  const select = (): void => state.selectExec(i);
  const storeHere = (): void => programmer.storeCue(i, null);
  const name = requireChild(card, '.ex-name');
  name.onclick = requireChild(card, '.ex-sel').onclick = () => {
    store.intercept(storeHere);
    select();
  };
  name.ondblclick = () =>
    modal.rename(`Executor ${i + 1}`, e.name, (v) => {
      e.name = v;
      bus.emit('showChanged', undefined);
    });
  requireChild(card, '.ex-off').onclick = () => {
    e.off();
    e.level = i === 0 ? e.level : 0;
  };
  requireChild(card, '.b-go').onclick = () => {
    if (store.intercept(storeHere)) {
      select();
      return;
    }
    select();
    pool.go(e, 1);
  };
  requireChild(card, '.b-back').onclick = () => {
    select();
    pool.go(e, -1);
  };
  const flash = requireChild(card, '.b-flash');
  flash.onpointerdown = () => {
    if (!e.cues.length) return;
    pool.flashPress(e);
    flash.classList.add('on');
  };
  const release = (): void => {
    if (!e.flash) return;
    pool.flashRelease(e);
    flash.classList.remove('on');
  };
  flash.onpointerup = release;
  flash.onpointerleave = release;
  bindFader(
    requireChild(card, '.fader'),
    () => e.level,
    (v) => {
      e.flashOnly = false;
      pool.setLevel(e, v);
    },
  );
}
