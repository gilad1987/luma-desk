/** Node stand-ins for the DOM pieces the render core touches (canvas, viewer, requestAnimationFrame). */
import { vi } from 'vitest';

/** Node has no DOM: a canvas stand-in with the fields OrbitControls and the picker touch. */
export function fakeStageCanvas(rect = { left: 0, top: 0, width: 200, height: 100 }): HTMLCanvasElement {
  const canvas = {
    style: {},
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    getBoundingClientRect: () => rect,
  };
  return canvas as unknown as HTMLCanvasElement;
}

/** A `#viewer` stand-in with a fixed client size. */
export function fakeViewer(clientWidth: number, clientHeight: number): HTMLElement {
  return { clientWidth, clientHeight } as unknown as HTMLElement;
}

/** Replaces requestAnimationFrame with a queue the test drains by hand. */
export function queuedAnimationFrames(): { run: () => void; pending: () => number } {
  const queue: FrameRequestCallback[] = [];
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => queue.push(callback));
  return {
    run: () => queue.splice(0).forEach((callback) => callback(0)),
    pending: () => queue.length,
  };
}
