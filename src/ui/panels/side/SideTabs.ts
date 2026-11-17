import type { EngineBus } from '../../../engine/events';
import type { LayoutMode } from '../layoutMode';
import { SIDE_TABS, sideTabsMarkup, type SideTab } from './sideTabsMarkup';

/**
 * The tab bar over the side panes. It owns which pane shows, because the sequence and sheet panels repaint only while
 * their pane is visible and the layouts and the tour switch panes through {@link SideTabs.show}.
 */
export class SideTabs {
  #current: SideTab = 'pools';
  readonly #buttons = new Map<SideTab, HTMLElement>();
  readonly #mode: () => LayoutMode;

  /** Renders the bar at the end of `host` (`#side`), before the panes, and wires the clicks. */
  constructor(host: HTMLElement, bus: EngineBus, mode: () => LayoutMode) {
    this.#mode = mode;
    host.insertAdjacentHTML('beforeend', sideTabsMarkup);
    const buttons = host.querySelectorAll<HTMLElement>('#sideTabs button');
    SIDE_TABS.forEach(([tab], i) => {
      const button = buttons[i];
      if (!button) throw new Error(`side tab ${tab} is missing`);
      this.#buttons.set(tab, button);
      button.onclick = () => {
        this.#current = tab;
        for (const [t, b] of this.#buttons) b.classList.toggle('on', t === tab);
        // panes are looked up per click: each pane panel renders its own markup after this bar
        document.querySelectorAll('.pane').forEach((p) => p.classList.toggle('on', p.id === 'pane-' + tab));
        bus.emit('stateDirty', undefined);
      };
    });
  }

  /** The pane on screen; the slow tick repaints the sequence or the sheet only while theirs is. */
  get current(): SideTab {
    return this.#current;
  }

  /**
   * Switches pane as a click on its tab would (the old `sideTo`). The MA layout shows the pools on their own screen,
   * so there the Pools tab is never selected (quirk Q19).
   */
  show(tab: SideTab): void {
    if (tab !== 'pools' || this.#mode() !== 'ma') this.#buttons.get(tab)?.click();
  }
}
