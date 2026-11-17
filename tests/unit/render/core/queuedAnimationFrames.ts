import { vi } from 'vitest';

/** Replaces requestAnimationFrame with a queue the test drains by hand, so camera tweens step deterministically. */
export function queuedAnimationFrames(): { run: () => void; pending: () => number } {
  const queue: FrameRequestCallback[] = [];
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => queue.push(callback));
  return {
    run: () => queue.splice(0).forEach((callback) => callback(0)),
    pending: () => queue.length,
  };
}
