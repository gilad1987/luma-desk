import { he } from '../../../i18n/he';
import { requireChild } from '../../dom';
import type { WaIconName } from '../wa/waIcons';
import { iconButton, type IconButton } from './iconButton';

/** What the centre shows: the plan alone, the plan and the 3D view split, or the 3D view alone. */
export type ViewMode = 'plan' | 'split' | '3d';

const MODES: readonly ViewMode[] = ['plan', 'split', '3d'];

const BUTTONS: Readonly<Record<ViewMode, IconButton>> = {
  plan: modeButton('plan', 'plan', 'Plan', he.builder.shell.modePlan),
  split: modeButton('split', 'split', 'Split', he.builder.shell.modeSplit),
  '3d': modeButton('3d', 'cube', '3D', he.builder.shell.mode3d),
};

/**
 * The Plan, Split and 3D buttons of the builder bar. It owns the current mode and shows it as the one pressed
 * button; it does not lay out the centre itself, it tells `onChange` (the `CentreSplit`), so the switch and the split
 * can change apart. A press on the mode already shown sends nothing.
 */
export class ViewModeSwitch {
  readonly #buttons: ReadonlyMap<ViewMode, HTMLElement>;
  readonly #onChange: (mode: ViewMode) => void;
  #mode: ViewMode;

  /** Renders the button group into `root` with `initial` pressed; `onChange` hears only later changes. */
  constructor(root: HTMLElement, initial: ViewMode, onChange: (mode: ViewMode) => void) {
    root.innerHTML = `<wa-button-group label="View">${MODES.map((mode) => iconButton(BUTTONS[mode])).join('\n')}</wa-button-group>`;
    this.#buttons = new Map(MODES.map((mode) => [mode, requireChild(root, `[data-mode="${mode}"]`)]));
    for (const [mode, button] of this.#buttons) button.onclick = () => this.set(mode);
    this.#onChange = onChange;
    this.#mode = initial;
    this.#paint();
  }

  get mode(): ViewMode {
    return this.#mode;
  }

  /** Shows `mode` as pressed and reports it; the mode already shown is a no-op. */
  set(mode: ViewMode): void {
    if (mode === this.#mode) return;
    this.#mode = mode;
    this.#paint();
    this.#onChange(mode);
  }

  #paint(): void {
    for (const [mode, button] of this.#buttons) {
      const isPressed = mode === this.#mode;
      button.classList.toggle('is-pressed', isPressed);
      button.setAttribute('aria-pressed', String(isPressed));
    }
  }
}

function modeButton(mode: ViewMode, icon: WaIconName, label: string, tip: string): IconButton {
  return { id: `builder-mode-${mode}`, hook: `data-mode="${mode}"`, icon, label, tip };
}
