import { afterEach, describe, expect, it, vi } from 'vitest';
import { performanceClock } from '../../../src/core/index.ts';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('performanceClock', () => {
  it('reads performance.now() on every call, so stubbing it freezes the clock', () => {
    const now = vi.spyOn(performance, 'now').mockReturnValue(1234.5);
    expect(performanceClock.nowMs()).toBe(1234.5);
    now.mockReturnValue(9000);
    expect(performanceClock.nowMs()).toBe(9000);
  });

  it('gives seconds as performance.now() / 1000, the original nowS expression', () => {
    for (const ms of [0, 1, 1234.5, 16.666666666666668, 1e12]) {
      vi.spyOn(performance, 'now').mockReturnValue(ms);
      expect(performanceClock.nowSeconds()).toBe(ms / 1000);
    }
  });
});
