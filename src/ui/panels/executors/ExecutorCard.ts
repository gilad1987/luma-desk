import type { Executor } from '../../../engine/Executor';
import { requireChild } from '../../dom';
import { createElement, paintFader } from '../../shared';
import { executorCardMarkup } from './executorCardMarkup';
import { executorCardText } from './executorCardText';
import type { ExecutorsDeps } from './ExecutorsDeps';
import { wireExecutorCard } from './wireExecutorCard';

/** One executor card (`.ex`) in `#execs`: name, cues, fader, GO/BACK/FLASH and level; repainted on the fast tick. */
export class ExecutorCard {
  /** The `.ex` element; the panel appends it to `#execs`. */
  readonly element: HTMLDivElement;
  readonly #exec: Executor;
  readonly #index: number;
  readonly #name: HTMLElement;
  readonly #cue: HTMLElement;
  readonly #next: HTMLElement;
  readonly #fader: HTMLElement;
  readonly #level: HTMLElement;

  /** Builds and wires the card of executor `index` (0-based). */
  constructor(exec: Executor, index: number, deps: ExecutorsDeps) {
    this.#exec = exec;
    this.#index = index;
    this.element = createElement('div', 'ex', executorCardMarkup(index + 1));
    this.#name = requireChild(this.element, '.ex-name');
    this.#cue = requireChild(this.element, '.c');
    this.#next = requireChild(this.element, '.x');
    this.#fader = requireChild(this.element, '.fader');
    this.#level = requireChild(this.element, '.ex-lvl');
    wireExecutorCard(this.element, exec, index, deps);
  }

  /** Paints selection, on state, texts and fader level (the per-executor part of the old `updateExecUI`). */
  paint(selectedIndex: number): void {
    const e = this.#exec,
      d = this.element;
    d.classList.toggle('sel', this.#index === selectedIndex);
    d.classList.toggle('on', e.on);
    const text = executorCardText(e, this.#index);
    this.#name.textContent = text.name;
    this.#cue.textContent = text.cue;
    this.#next.textContent = text.next;
    paintFader(this.#fader, e.level);
    this.#level.textContent = Math.round(e.level * 100) + '%';
    d.style.setProperty('--lv', String(e.level));
  }
}
