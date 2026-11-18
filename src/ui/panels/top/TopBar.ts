import type { AppState } from '../../../engine/AppState';
import { byId } from '../../dom';
import { topBarMarkup } from './topBarMarkup';
import { VIEWS, type ViewName } from './topBarViews';

/**
 * A render flag one top-bar button flips. The render object owns the state and the button only shows it, so there
 * is no second copy of the flag in the UI that could drift from what is drawn.
 */
export interface RenderToggle {
  isOn(): boolean;
  set(on: boolean): void;
}

/** The renderer controls the bar drives; plain callbacks, so the UI does not import the renderer. */
export interface TopBarRender {
  setView(view: ViewName): void;
  setHouseLevel(level: number): void;
  readonly glow: RenderToggle;
  /** Real light: spot lights and shadow maps on performers. */
  readonly realLight: RenderToggle;
  readonly fixtureIds: RenderToggle;
}

/** Flips `flag` and lights the button with the new state; the markup's `on` class matches the render start value. */
function wireToggle(id: string, flag: RenderToggle): void {
  const button = byId(id);
  button.onclick = () => {
    const on = !flag.isOn();
    flag.set(on);
    button.classList.toggle('on', on);
  };
}

/**
 * The top bar: camera views, house and haze sliders, and the Glow / Fixture IDs / Real light toggles. The other
 * buttons in it are wired by their own modules after the bar renders.
 */
export class TopBar {
  readonly #state: AppState;
  readonly #haze: HTMLInputElement;

  /** Renders the bar at the start of `host` (`#app`) and wires its own controls. */
  constructor(host: HTMLElement, state: AppState, render: TopBarRender) {
    this.#state = state;
    host.insertAdjacentHTML('afterbegin', topBarMarkup);
    const viewButtons = host.querySelectorAll<HTMLElement>('[data-view]');
    VIEWS.forEach(([view], i) => {
      const button = viewButtons[i];
      if (button) button.onclick = () => render.setView(view);
    });
    const house = byId('house', HTMLInputElement),
      haze = byId('haze', HTMLInputElement);
    house.oninput = () => render.setHouseLevel(Number(house.value) / 100);
    haze.oninput = () => (state.haze = Number(haze.value) / 100);
    this.#haze = haze;
    wireToggle('glowBtn', render.glow);
    wireToggle('realBtn', render.realLight);
    wireToggle('idsBtn', render.fixtureIds);
  }

  /**
   * Moves the Haze slider to `AppState.haze`. A show load emits no event (the loader leaves repaints to its caller),
   * so boot, import and the demo call this right after loading and before the pools repaint, the original order.
   */
  syncHaze(): void {
    this.#haze.value = String(this.#state.haze * 100);
  }
}
