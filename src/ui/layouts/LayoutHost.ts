/** What a layout change touches outside the layouts: side tabs, keypad, encoders and the renderer. */
export interface LayoutHost {
  readonly sideTabs: { readonly current: string; show(tab: string): void };
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
