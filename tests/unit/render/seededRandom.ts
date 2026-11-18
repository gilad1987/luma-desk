import { vi } from 'vitest';
import { rng } from '../../../src/core';

/**
 * Runs `build` with `Math.random` replaced by a fixed stream, as the screenshot suite does. three.js takes every
 * object's uuid from `Math.random`, so two builds give the same uuids only if they create objects in the same order.
 */
export function withSeededRandom<T>(build: () => T): T {
  const random = vi.spyOn(Math, 'random').mockImplementation(rng(1234));
  try {
    return build();
  } finally {
    random.mockRestore();
  }
}
