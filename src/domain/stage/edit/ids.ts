import type { StageDesign } from '../StageDesign';
import type { TrussKind } from '../types';

/** Fixture ids come in blocks of 100 (front 101-120, mid 201-230), so a user reads a batch from its hundred. */
const ID_BLOCK = 100;

/**
 * The first id of the next free block: the highest fixture id ever used rounded up to a full hundred, plus 1 (an empty
 * design starts at 1). A new batch then never shares a hundred with an older one, so its ids read as one group.
 */
export function nextIdBlock(d: StageDesign): number {
  const highest = nextFixtureId(d) - 1;
  return Math.ceil(highest / ID_BLOCK) * ID_BLOCK + 1;
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
