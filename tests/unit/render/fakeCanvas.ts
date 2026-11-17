import { vi } from 'vitest';

/** The client rect fields the render code reads from `getBoundingClientRect()`. */
interface FakeRect {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

/** What a test can set on the fake canvas; a missing field keeps a neutral default. */
export interface FakeCanvasOptions {
  /** What `getContext` returns: default an empty object, `null` for a browser with no 2D context. */
  readonly context?: object | null;
  readonly rect?: FakeRect;
  readonly clientWidth?: number;
  readonly clientHeight?: number;
}

/**
 * A Node stand-in for a canvas (or any sized element) with the members the render code touches: the backing size
 * and `getContext` for drawCanvas and three's CanvasTexture, `toDataURL` for the gobo icons, `style` and listeners
 * for OrbitControls, the client rect for picking and the client size for the viewer.
 */
export function fakeCanvas(options: FakeCanvasOptions = {}): HTMLCanvasElement {
  const { context = {}, rect = { left: 0, top: 0, width: 200, height: 100 } } = options;
  const canvas = {
    width: 300,
    height: 150,
    clientWidth: options.clientWidth ?? 0,
    clientHeight: options.clientHeight ?? 0,
    style: {},
    getContext: vi.fn(() => context),
    toDataURL: () => 'data:',
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    getBoundingClientRect: () => rect,
  };
  // The one cast the render tests keep: CanvasTexture and OrbitControls take DOM types that no plain object can
  // satisfy in Node. The object above carries every member those callers read.
  return canvas as unknown as HTMLCanvasElement;
}
