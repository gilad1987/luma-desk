import type { OpticsCondition } from '../../../domain/stage/optics/OpticsFunction';
import type { GdtfFunction } from './GdtfFunction';

/** A channel function with its `ModeMaster` condition, as `placedFunctions` gives it. */
interface Conditional {
  readonly fn: GdtfFunction;
  readonly when?: OpticsCondition;
}

/**
 * Of the functions `same` of one attribute, the one active while the device is in its default state: its
 * `ModeMaster` range holds the master's default DMX value. The master's default is the `Default` of its initial
 * function, else of its first. `undefined` when no function has a condition or no master has a default.
 */
export function activeByDefault<T extends Conditional>(placed: readonly T[], same: readonly T[]): T | undefined {
  return same.find(({ when }) => {
    if (when === undefined) return false;
    const master = placed.filter((entry) => entry.fn.attribute === when.attribute && entry.when === undefined);
    const value = (master.find((entry) => entry.fn.initial) ?? master[0])?.fn.defaultDmx;
    return value !== undefined && value >= when.dmxFrom && value <= when.dmxTo;
  });
}
