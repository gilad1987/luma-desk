import { clamp } from '../../core';
import { requireChild } from '../dom';
import { boxMap, createElement, pointerDrag, type BoxMap } from '../shared';
import { EncoderTurn, type EncoderRange } from './EncoderTurn';

/** What the encoder asks of its panel: change the value by a delta, or open the number entry for it. */
export interface EncoderHandlers {
  delta(amount: number): void;
  edit(): void;
}

/** The knob sweep in degrees, centred on twelve o'clock (from -135° to +135°). */
const SWEEP_DEG = 270;
/** Knob colour for a programmed value and for a value the fixture shows on its own. */
const PROGRAMMED_COLOR = '#ff4040';
const LIVE_COLOR = '#ffc21a';

/**
 * One encoder: label, knob and value readout (`.encoder` with `data-a`). The knob turns by vertical drag (relative
 * to the last move, Shift for fine) and by wheel; a double click on the value opens the number entry.
 */
export class Encoder {
  /** The `.encoder` element; the panel appends it to `#encoders`. */
  readonly element: HTMLDivElement;
  readonly #range: EncoderRange;
  readonly #knob: HTMLElement;
  readonly #value: HTMLElement;
  readonly #indicator: HTMLElement;

  constructor(attr: string, range: EncoderRange, handlers: EncoderHandlers) {
    this.#range = range;
    this.element = createElement(
      'div',
      'encoder',
      `<div class="lb">${range.label}</div><div class="knob"><div class="ind"></div></div><div class="val">—</div>`,
    );
    this.element.dataset.a = attr;
    this.#knob = requireChild(this.element, '.knob');
    this.#value = requireChild(this.element, '.val');
    this.#indicator = requireChild(this.element, '.ind');
    this.#bindKnob(new EncoderTurn(range, (d) => handlers.delta(d)));
    this.#value.ondblclick = () => handlers.edit();
  }

  /**
   * Shows `value` (null = no fixture to read, drawn at the bottom). `programmed` marks a programmer value (red knob,
   * `.p` readout); `disabled` dims the encoder when the selection has no fixture with this attribute.
   */
  paint(value: number | null, programmed: boolean, disabled: boolean, text: string): void {
    const { min, max } = this.#range;
    this.element.classList.toggle('dis', disabled);
    this.#value.textContent = text;
    this.#value.classList.toggle('p', programmed);
    const k = clamp(value == null ? 0 : (value - min) / (max - min), 0, 1);
    this.#knob.style.setProperty('--kv', k * SWEEP_DEG + 'deg');
    this.#knob.style.setProperty('--kc', programmed ? PROGRAMMED_COLOR : LIVE_COLOR);
    this.#indicator.style.transform = `rotate(${-SWEEP_DEG / 2 + k * SWEEP_DEG}deg)`;
  }

  #bindKnob(turn: EncoderTurn): void {
    const knob = this.#knob;
    let map: BoxMap | undefined,
      lastY = 0;
    pointerDrag(knob, {
      start: (ev) => {
        map = boxMap(knob);
        lastY = map(ev)[1] * map.h;
        turn.reset();
      },
      move: (ev) => {
        if (!map) return;
        const y = map(ev)[1] * map.h,
          dy = lastY - y;
        lastY = y;
        turn.drag(dy, ev.shiftKey);
      },
      preventDefault: true,
    });
    knob.onwheel = (ev) => {
      ev.preventDefault();
      turn.wheel(ev.deltaY, ev.shiftKey);
    };
  }
}
