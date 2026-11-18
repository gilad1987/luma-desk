import type { LayoutPrefs } from '../../show';
import type { SideTab } from '../panels/side/sideTabsMarkup';

/** What a layout change touches outside the layouts: side tabs, keypad, encoders, the renderer and the saved layout. */
export interface LayoutHost {
  readonly sideTabs: { readonly current: SideTab; show(tab: SideTab): void };
  /** The show layer's saved layout (`lumadesk-layout2`), its one owner: read at boot, written on every change. */
  readonly prefs: Pick<LayoutPrefs, 'load' | 'save'>;
  /** The keypad element, built on first use. */
  keypad(): HTMLElement;
  /** Detaches the keypad if it was ever built. */
  removeKeypad(): void;
  renderEncoders(): void;
  resize(): void;
  currentView(): string;
  setView(view: string, instant: boolean): void;
  setConsoleHeight(px: number): void;
}
