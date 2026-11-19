import { requireChild } from '../../dom';
import { setWaDisabled } from '../wa/waButton';
import { listenWa } from '../wa/waEvents';
import type { ViewMode } from './ViewModeSwitch';

/** The `wa-split-panel` as the builder drives it: `position` is the 3D (start) pane's share in percent, 0..100. */
type SplitPanel = HTMLElement & { position: number };

/** The divider position on the first Split, in percent: plan and 3D get half each. */
const DEFAULT_SPLIT_PERCENT = 50;
/** The position in Plan mode: the 3D pane collapses to 0 %. */
const PLAN_ONLY_PERCENT = 0;
/** The position in 3D mode: the 3D pane takes 100 %. */
const VIEW_ONLY_PERCENT = 100;

const MODE_CLASSES: Readonly<Record<ViewMode, string>> = {
  plan: 'is-mode-plan',
  split: 'is-mode-split',
  '3d': 'is-mode-3d',
};

/**
 * Lays out the builder centre for a view mode: it owns the split panel's position and the `is-mode-*` class of the
 * centre, and remembers where the user left the divider in Split, so a trip to Plan or 3D and back does not lose it.
 * Only a move in Split mode is remembered; the 0 and 100 of the other modes are not the user's choice. It does not own
 * the mode buttons (`ViewModeSwitch`) or what the panes hold.
 *
 * Risk (docs/plan/stage-builder-dnd/01-shell.md): a 0 % pane gives the renderer a 0 px box, so the 3D canvas sizes
 * to 0 height in Plan mode; QA watches the console in both single-view modes.
 */
export class CentreSplit {
  readonly #centre: HTMLElement;
  readonly #panel: SplitPanel;
  readonly #stop: () => void;
  #mode: ViewMode;
  #splitPercent = DEFAULT_SPLIT_PERCENT;

  /** `centre` is `.builder-centre` holding the upgraded `wa-split-panel`; `initial` is laid out at once. */
  constructor(centre: HTMLElement, initial: ViewMode) {
    this.#centre = centre;
    this.#panel = splitPanelIn(centre);
    this.#mode = initial;
    this.#stop = listenWa(this.#panel, 'wa-reposition', () => this.#remember());
    this.setMode(initial);
  }

  /** Shows `mode`: Split brings back the remembered divider and frees it, Plan and 3D fix it at an edge. */
  setMode(mode: ViewMode): void {
    this.#mode = mode;
    for (const [each, name] of Object.entries(MODE_CLASSES)) this.#centre.classList.toggle(name, each === mode);
    setWaDisabled(this.#panel, mode !== 'split');
    this.#panel.position = this.#positionOf(mode);
  }

  /** Stops listening to the divider (U6). */
  dispose(): void {
    this.#stop();
  }

  #positionOf(mode: ViewMode): number {
    switch (mode) {
      case 'plan':
        return PLAN_ONLY_PERCENT;
      case 'split':
        return this.#splitPercent;
      case '3d':
        return VIEW_ONLY_PERCENT;
    }
  }

  #remember(): void {
    if (this.#mode === 'split') this.#splitPercent = this.#panel.position;
  }
}

/** The split panel under `centre`; it must be upgraded, or setting `position` would only add a plain property. */
function splitPanelIn(centre: HTMLElement): SplitPanel {
  const panel = requireChild(centre, 'wa-split-panel');
  if (!isSplitPanel(panel)) {
    throw new Error('CentreSplit: wa-split-panel has no numeric position; is Web Awesome registered before mount?');
  }
  return panel;
}

function isSplitPanel(element: HTMLElement): element is SplitPanel {
  return 'position' in element && typeof element.position === 'number';
}
