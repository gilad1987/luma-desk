import type { AttrName } from '../../domain/attributes';

/**
 * A `for...in` key of an `AttrValues` record as an attribute name. The per-frame merges walk the records with
 * `for...in` because {@link attrEntries} builds an array per call; `for...in` types its key as `string`, and this is the
 * one place those loops state that it is an attribute name. Saved shows are not validated, so an unknown key passes
 * through exactly as the untyped code let it.
 */
export function attrName(key: string): AttrName {
  return key as AttrName;
}
