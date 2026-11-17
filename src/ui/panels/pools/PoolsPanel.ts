import { PRESET_TYPES, type PresetType } from '../../../engine/presetTypes';
import { byId } from '../../dom';
import { createElement } from '../../shared';
import { groupSlot } from './groupSlot';
import { poolsMarkup } from './poolsMarkup';
import type { PoolsDeps } from './PoolsDeps';
import { presetSlot } from './presetSlot';

/** A full grid: 6 x 8 in Desk/Classic, 12 x 4 in the MA layout. */
const GROUP_SLOTS = 48;
/** Slots per preset pool. */
const PRESET_SLOTS = 30;
const isPresetTab = (n: number): n is PresetType => n in PRESET_TYPES;
/** The tabs in pool-number order, as the old `for…in` over the pool names gave them. */
const PRESET_TAB_ORDER = Object.keys(PRESET_TYPES).map(Number).filter(isPresetTab);

/**
 * The group and preset pools. It repaints only when the pools change (`poolsChanged`, synchronous, so exactly where
 * the old code called `renderPools`), on a preset tab click and after a rename; never on the ticks or on selection
 * changes (quirk Q4).
 */
export class PoolsPanel {
  #presetTab: PresetType = 4;
  readonly #deps: PoolsDeps;
  readonly #groupPool: HTMLElement;
  readonly #presetTabs: HTMLElement;
  readonly #presetPool: HTMLElement;

  /** Renders the Pools pane at the end of `host` (`#side`, after the tab bar) and subscribes to `poolsChanged`. */
  constructor(host: HTMLElement, deps: PoolsDeps) {
    this.#deps = deps;
    host.insertAdjacentHTML('beforeend', poolsMarkup);
    this.#groupPool = byId('groupPool');
    this.#presetTabs = byId('presetTabs');
    this.#presetPool = byId('presetPool');
    deps.bus.on('poolsChanged', () => this.render());
  }

  /** Rebuilds every slot and tab from the pools. */
  render(): void {
    const repaint = (): void => this.render();
    this.#groupPool.innerHTML = '';
    for (let n = 1; n <= GROUP_SLOTS; n++) this.#groupPool.appendChild(groupSlot(n, this.#deps, repaint));
    this.#presetTabs.innerHTML = '';
    for (const t of PRESET_TAB_ORDER) {
      const b = createElement('button', t === this.#presetTab ? 'on' : '', `${t} ${PRESET_TYPES[t]}`);
      b.onclick = () => {
        this.#presetTab = t;
        this.render();
      };
      this.#presetTabs.appendChild(b);
    }
    this.#presetPool.innerHTML = '';
    for (let n = 1; n <= PRESET_SLOTS; n++) {
      this.#presetPool.appendChild(presetSlot(this.#presetTab, n, this.#deps, repaint));
    }
  }
}
