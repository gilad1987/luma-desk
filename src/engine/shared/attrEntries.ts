import type { AttrName, AttrValues } from '../../domain/attributes';

/**
 * The attributes present in `values` with their numbers, in key order. `Object.entries` types keys as `string`; this is
 * the one place the engine states that the keys of an `AttrValues` record are attribute names. Saved shows are not
 * validated, so an unknown key passes through exactly as the untyped code let it.
 */
export function attrEntries(values: AttrValues): [AttrName, number][] {
  return Object.entries(values) as [AttrName, number][];
}
