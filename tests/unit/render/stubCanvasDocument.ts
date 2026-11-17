import { vi } from 'vitest';
import { fakeCanvas } from './fakeCanvas';

/**
 * A 2D context that accepts every call and property: the painters run (and draw their seeded randoms) but draw
 * nothing. Every call returns the context itself, so gradients take `addColorStop` too. `roundRect` reads as
 * missing, the path the fixture golden was recorded on (the lens painter falls back to plain rects).
 */
function fakeContext2d(): object {
  const context: object = new Proxy(
    {},
    {
      get: (_, key) => (key === 'roundRect' ? undefined : () => context),
      set: () => true,
    },
  );
  return context;
}

/** Stubs `document` so `drawCanvas` works in Node; call `vi.unstubAllGlobals()` after. */
export function stubCanvasDocument(): void {
  const context = fakeContext2d();
  vi.stubGlobal('document', { createElement: () => fakeCanvas({ context }) });
}
