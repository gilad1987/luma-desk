import { vi } from 'vitest';

/** Node has no DOM: a canvas stand-in with only the fields drawCanvas and three's CanvasTexture touch. */
export function fakeCanvas(context: object | null = {}): HTMLCanvasElement {
  const canvas = { width: 300, height: 150, getContext: vi.fn(() => context) };
  return canvas as unknown as HTMLCanvasElement;
}
