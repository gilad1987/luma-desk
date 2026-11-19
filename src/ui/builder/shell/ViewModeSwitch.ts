import { he } from '../../../i18n/he';
import { requireChild } from '../../dom';
import { iconSvg, type WaIconName } from '../wa/waIcons';

/** What the centre shows: the plan alone, the plan and the 3D view split, or the 3D view alone. */
export type ViewMode = 'plan' | 'split' | '3d';

const MODES: readonly ViewMode[] = ['plan', 'split', '3d'];

/** Each mode radio's icon, English label (the accessible name) and Hebrew tooltip. */
const LOOKS: Readonly<Record<ViewMode, { icon: WaIconName; label: string; tip: string }>> = {
  plan: { icon: 'plan', label: 'Plan', tip: he.builder.shell.modePlan },
  split: { icon: 'split', label: 'Split', tip: he.builder.shell.modeSplit },
  '3d': { icon: 'cube', label: '3D', tip: he.builder.shell.mode3d },
};

/** Steps of the arrow keys; the builder is always left to right (U8), so Right and Down go to the next mode. */
const ARROW_STEPS: Readonly<Record<string, number>> = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };

/**
 * The Plan, Split and 3D radios of the builder bar. It owns the current mode and shows it as the one checked radio;
 * it does not lay out the centre itself, it tells `onChange` (the `CentreSplit`), so the switch and the split can
 * change apart. A press on the mode already shown sends nothing. The radios are native buttons, not `wa-button`s: a
 * role on a `wa-button` host left the name, the focus and the checked state on two different elements, so a screen
 * reader never heard which mode was on. Only the checked radio is in the Tab order, and the arrow keys move and select.
 */
export class ViewModeSwitch {
  readonly #radios: ReadonlyMap<ViewMode, HTMLElement>;
  readonly #onChange: (mode: ViewMode) => void;
  #mode: ViewMode;

  /** Renders the radio group into `root` with `initial` checked; `onChange` hears only later changes. */
  constructor(root: HTMLElement, initial: ViewMode, onChange: (mode: ViewMode) => void) {
    const radios = MODES.map(modeMarkup).join('\n');
    root.innerHTML = `<div class="mode-group" role="radiogroup" aria-label="View">${radios}</div>`;
    this.#radios = new Map(MODES.map((mode) => [mode, requireChild(root, `[data-mode="${mode}"]`)]));
    for (const [mode, radio] of this.#radios) {
      radio.onclick = () => this.set(mode);
      radio.onkeydown = (ev) => this.#moveByKey(ev);
    }
    this.#onChange = onChange;
    this.#mode = initial;
    this.#paint();
  }

  get mode(): ViewMode {
    return this.#mode;
  }

  /** Shows `mode` as checked and reports it; the mode already shown is a no-op. */
  set(mode: ViewMode): void {
    if (mode === this.#mode) return;
    this.#mode = mode;
    this.#paint();
    this.#onChange(mode);
  }

  /** An arrow key, Home or End selects the target mode and moves the focus to it, as a native radio group does. */
  #moveByKey(ev: KeyboardEvent): void {
    const target = this.#targetOf(ev.key);
    if (target === undefined) return;
    ev.preventDefault();
    this.set(target);
    this.#radios.get(target)?.focus();
  }

  #targetOf(key: string): ViewMode | undefined {
    if (key === 'Home') return MODES.at(0);
    if (key === 'End') return MODES.at(-1);
    const step = ARROW_STEPS[key];
    if (step === undefined) return undefined;
    return MODES.at((MODES.indexOf(this.#mode) + step + MODES.length) % MODES.length);
  }

  #paint(): void {
    for (const [mode, radio] of this.#radios) {
      const isChecked = mode === this.#mode;
      radio.classList.toggle('is-pressed', isChecked);
      radio.setAttribute('aria-checked', String(isChecked));
      radio.tabIndex = isChecked ? 0 : -1;
    }
  }
}

/**
 * One radio and its tooltip. The tooltip's anchor is a wrapper `span`, not the radio: `wa-tooltip` adds its id to the
 * anchor's `aria-labelledby`, which would replace the radio's name ("Plan") with the Hebrew text. The help is the
 * radio's `aria-description`: an `aria-describedby` at the closed tooltip gave Chromium an empty description, as the
 * text sits in a hidden shadow slot.
 */
function modeMarkup(mode: ViewMode): string {
  const { icon, label, tip } = LOOKS[mode];
  const id = `builder-mode-${mode}`;
  return (
    `<span id="${id}" class="mode-anchor"><button type="button" class="mode-radio" role="radio" data-mode="${mode}" ` +
    `aria-description="${tip}">${iconSvg(icon)}<span class="mode-label">${label}</span></button></span>\n` +
    `<wa-tooltip for="${id}" dir="rtl">${tip}</wa-tooltip>`
  );
}
