import { vi } from 'vitest';

/** The pointer fields the components read; property signatures, so `expect(ev.preventDefault)` is not unbound. */
export interface FakePointerEvent {
  readonly pointerId: number;
  readonly clientX: number;
  readonly clientY: number;
  readonly shiftKey: boolean;
  readonly preventDefault: () => void;
}

/** A primary-pointer event at (clientX, clientY) with a spy for `preventDefault`. */
export const pointer = (clientX: number, clientY: number, shiftKey = false): FakePointerEvent => ({
  pointerId: 1,
  clientX,
  clientY,
  shiftKey,
  preventDefault: vi.fn(),
});
