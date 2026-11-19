import type { NarrowScreen } from '../../../../src/ui/builder/shell/InspectorHost.ts';

/**
 * A `matchMedia` result a test can flip: `flip(isNarrow)` sets `matches` and runs every `change` listener the builder
 * holds, as the browser does when the window crosses the breakpoint. `listeners` shows what a dispose left behind.
 */
export class FakeNarrowScreen implements NarrowScreen {
  matches: boolean;
  readonly listeners = new Set<EventListener>();

  constructor(isNarrow = false) {
    this.matches = isNarrow;
  }

  addEventListener(_type: string, listener: EventListener): void {
    this.listeners.add(listener);
  }

  removeEventListener(_type: string, listener: EventListener): void {
    this.listeners.delete(listener);
  }

  flip(isNarrow: boolean): void {
    this.matches = isNarrow;
    this.listeners.forEach((listener) => listener(new Event('change')));
  }
}
