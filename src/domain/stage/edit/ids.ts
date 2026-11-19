import type { StageDesign } from '../StageDesign';
import type { TrussKind } from '../types';

/** Fixture ids come in blocks of 100 (front 101-120, mid 201-230), so a user reads a batch from its hundred. */
const ID_BLOCK = 100;

/**
 * The highest `nextFixtureId` a stored design may hold (one billion), unless a fixture id of the design is higher (an
 * MVR import keeps the file's FixtureIDs). A rig has hundreds of fixtures; the bound keeps the next block (the mark
 * rounded up to a hundred) and any batch after it far below `Number.MAX_SAFE_INTEGER`, past which `id + 1` can equal
 * `id` and ids would repeat. `nextIdBlock` refuses a batch that would pass it.
 */
export const MAX_ID_MARK = 1_000_000_000;

/**
 * The first id of the next free block for a batch of `count` ids: the highest fixture id ever used rounded up to a
 * full hundred, plus 1 (an empty design starts at 1). A new batch then never shares a hundred with an older one, so
 * its ids read as one group.
 * @throws RangeError when the last id of the batch is not a safe integer (a stored fixture id near
 * `Number.MAX_SAFE_INTEGER`), as the ids could repeat.
 */
export function nextIdBlock(d: StageDesign, count: number): number {
  const highest = nextFixtureId(d) - 1;
  const first = Math.ceil(highest / ID_BLOCK) * ID_BLOCK + 1;
  // count - 1 first: first + count can round past the safe limit and come back to it after the - 1
  if (!Number.isSafeInteger(first + (count - 1))) {
    throw new RangeError(`nextIdBlock: no ${count} safe fixture ids after ${highest}`);
  }
  return first;
}

/**
 * The lowest fixture id `d` never used: its stored mark or its highest id + 1, whichever is higher. An op that deletes
 * fixtures stores it in the result, so the ids of the deleted fixtures stay used for the life of the design.
 */
export function nextFixtureId(d: StageDesign): number {
  const highest = d.fixtures.reduce((top, f) => Math.max(top, f.id), 0);
  return Math.max(highest + 1, d.nextFixtureId ?? 1);
}

/**
 * A string id `<base>-<n>` with the smallest n >= 1 that no item uses yet. Trusses, risers and screens share this
 * rule, so ids stay short and readable in the property panel and in a saved show.
 */
export function newUniqueId(items: readonly { readonly id: string }[], base: string): string {
  const taken = new Set(items.map((item) => item.id));
  let n = 1;
  while (taken.has(`${base}-${n}`)) n += 1;
  return `${base}-${n}`;
}

/** A new truss id named after its kind (`circle-2`), so the user sees what a truss is from its id alone. */
export function newTrussId(d: StageDesign, kind: TrussKind): string {
  return newUniqueId(d.trusses, kind);
}
