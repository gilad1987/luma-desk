/**
 * A `ResizeObserver` the test fires by hand, which `FakeDom` installs: Node has none, and the builder plan view caches
 * its canvas box from one. `resize()` runs the callback as the browser does after a layout that changed an observed
 * box; `made` lists every observer since the last `FakeDom`. A real observer also fires once on `observe()`; the
 * fake does not, so a test fires it itself.
 */
export class FakeResizeObserver {
  static readonly made: FakeResizeObserver[] = [];
  readonly targets: unknown[] = [];
  readonly #callback: () => void;

  constructor(callback: () => void) {
    this.#callback = callback;
    FakeResizeObserver.made.push(this);
  }

  /** Fires every observer that still observes something. */
  static resizeAll(): void {
    FakeResizeObserver.made.forEach((observer) => observer.resize());
  }

  observe(target: unknown): void {
    this.targets.push(target);
  }

  disconnect(): void {
    this.targets.length = 0;
  }

  resize(): void {
    if (this.targets.length > 0) this.#callback();
  }
}
