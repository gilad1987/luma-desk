import type { SideTab } from '../panels/side/sideTabsMarkup';
import { ConsoleParts } from './ConsoleParts';
import type { LayoutHost } from './LayoutHost';

/**
 * Puts the panel nodes where a layout mode wants them and sets the matching body class. It owns the side-tab swap
 * the MA console needs, so the layout manager only sequences a mode change (place, refit, save).
 */
export class PanelPlacement {
  readonly #parts = new ConsoleParts();
  readonly #host: Pick<LayoutHost, 'sideTabs' | 'keypad' | 'removeKeypad'>;
  /** The tab MA forced onto screen 1 because Pools sits on screen 2; leaving MA gives Pools back. */
  #forcedTab: SideTab | null = null;

  constructor(host: Pick<LayoutHost, 'sideTabs' | 'keypad' | 'removeKeypad'>) {
    this.#host = host;
  }

  /** Moves the panels home, then into the slots of `deskMode` ('ma', 'desk', anything else = classic). */
  place(deskMode: string): void {
    const host = this.#host,
      body = document.body,
      ma = deskMode === 'ma';
    this.#parts.restore();
    body.classList.toggle('desk', deskMode === 'desk');
    body.classList.toggle('ma', ma);
    if (ma) {
      this.#parts.toMa(() => host.keypad());
      if (host.sideTabs.current === 'pools') {
        host.sideTabs.show('sheet');
        this.#forcedTab = 'sheet';
      }
    } else if (deskMode === 'desk') this.#parts.toDesk(() => host.keypad());
    else this.#parts.toClassic(() => host.removeKeypad());
    if (!ma && this.#forcedTab) {
      if (host.sideTabs.current === this.#forcedTab) host.sideTabs.show('pools');
      this.#forcedTab = null;
    }
  }
}
