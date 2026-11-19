import { Color } from 'three';
import type { WebGLRenderer } from 'three';
import { vi } from 'vitest';

/** The renderer state a pass may change, with a `render` that `onRender` can make throw. */
export interface FakeRenderer {
  autoClear: boolean;
  readonly shadowMap: { autoUpdate: boolean };
  readonly render: ReturnType<typeof vi.fn>;
  readonly setRenderTarget: ReturnType<typeof vi.fn>;
  readonly clear: ReturnType<typeof vi.fn>;
  readonly clearColor: Color;
  clearAlpha: number;
  getClearAlpha(): number;
  getClearColor(out: Color): Color;
  setClearColor(color: Color | number, alpha?: number): void;
  /** The same object, as the type a pass takes. */
  readonly asRenderer: WebGLRenderer;
}

/** A renderer with no GL context: it keeps the state a draw sets and counts the draws. */
export function createFakeRenderer(onRender: (renderer: FakeRenderer) => void = () => undefined): FakeRenderer {
  const fake: FakeRenderer = {
    autoClear: true,
    shadowMap: { autoUpdate: true },
    clearColor: new Color(0x123456),
    clearAlpha: 1,
    render: vi.fn(() => {
      onRender(fake);
    }),
    setRenderTarget: vi.fn(),
    clear: vi.fn(),
    getClearAlpha: () => fake.clearAlpha,
    getClearColor: (out) => out.copy(fake.clearColor),
    setClearColor: (color, alpha = 1) => {
      fake.clearColor.set(color);
      fake.clearAlpha = alpha;
    },
    get asRenderer(): WebGLRenderer {
      return fake as unknown as WebGLRenderer;
    },
  };
  return fake;
}
