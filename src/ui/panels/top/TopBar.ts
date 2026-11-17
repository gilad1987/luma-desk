import type { AppState } from '../../../engine/AppState';
import { byId } from '../../dom';
import { topBarMarkup } from './topBarMarkup';
import { VIEWS, type ViewName } from './topBarViews';

/** The renderer controls the bar drives; plain callbacks, so the UI does not import the renderer. */
export interface TopBarRender {
  setView(view: ViewName): void;
  setHouseLevel(level: number): void;
  setGlow(on: boolean): void;
  /** Real light: spot lights and shadow maps on performers. */
  setRealLight(on: boolean): void;
}

/** Flips a toggle button's state and its `on` light together. */
function toggle(id: string, initial: boolean, apply: (on: boolean) => void): () => boolean {
  let on = initial;
  const button = byId(id);
  button.onclick = () => {
    on = !on;
    apply(on);
    button.classList.toggle('on', on);
  };
  return () => on;
}

/**
 * The top bar: camera views, house and haze sliders, and the Glow / Fixture IDs / Real light toggles. The other
 * buttons in it are wired by their own modules after the bar renders.
 */
export class TopBar {
  readonly #showIds: () => boolean;
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
    toggle('glowBtn', true, (on) => render.setGlow(on));
    toggle('realBtn', true, (on) => render.setRealLight(on));
    this.#showIds = toggle('idsBtn', false, () => undefined);
  }

  /** Fixture IDs: the overlay draws the ids while this is on. */
  get showIds(): boolean {
    return this.#showIds();
  }

  /**
   * Moves the Haze slider to `AppState.haze`. A show load emits no event (the loader leaves repaints to its caller),
   * so boot, import and the demo call this right after loading and before the pools repaint, the original order.
   */
  syncHaze(): void {
    this.#haze.value = String(this.#state.haze * 100);
  }
}
