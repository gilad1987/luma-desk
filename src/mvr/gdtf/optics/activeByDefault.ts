import type { OpticsCondition, OpticsDrive } from '../../../domain/stage/optics/OpticsFunction';
import type { GdtfFunction } from './GdtfFunction';

/** A channel function with its DMX slots and its `ModeMaster` condition, as `placedFunctions` gives it. */
interface Conditional {
  readonly fn: GdtfFunction;
  readonly drives: readonly OpticsDrive[];
  readonly when?: OpticsCondition;
}

const slotsOf = (drives: readonly OpticsDrive[]): string =>
  drives.map(({ dmxBreak, offset }) => `${dmxBreak}:${offset.join(',')}`).join(';');

/**
 * The functions of the master `when` names. Two channels can carry the master's attribute (two `Gobo1` wheels on
 * two geometries), so the master is the channel with the condition's own slots; by attribute only when the condition
 * names no slot (its master channel was not found) or no channel has those slots.
 */
function masterOf<T extends Conditional>(placed: readonly T[], when: OpticsCondition): T[] {
  const byAttribute = placed.filter((entry) => entry.fn.attribute === when.attribute && entry.when === undefined);
  const slots = slotsOf(when.drives);
  const bySlots = byAttribute.filter((entry) => slotsOf(entry.drives) === slots);
  return when.drives.length > 0 && bySlots.length > 0 ? bySlots : byAttribute;
}

/**
 * Of the functions `same` of one attribute, the one active while the device is in its default state: its
 * `ModeMaster` range holds the master's default DMX value. The master's default is the `Default` of its initial
 * function, else of its first. `undefined` when no function has a condition or no master has a default.
 */
export function activeByDefault<T extends Conditional>(placed: readonly T[], same: readonly T[]): T | undefined {
  return same.find(({ when }) => {
    if (when === undefined) return false;
    const master = masterOf(placed, when);
    const value = (master.find((entry) => entry.fn.initial) ?? master[0])?.fn.defaultDmx;
    return value !== undefined && value >= when.dmxFrom && value <= when.dmxTo;
  });
}
