import type { Rig } from '../rig/Rig';
import { selectRule } from './query';
import type { StageDesign } from './StageDesign';
import { STANDARD_GROUPS } from './standardGroups';

/** The size of the group pool grid: 6 x 8 in Desk/Classic, 12 x 4 in the MA layout. */
export const GROUP_SLOTS = 48;

/**
 * A default group. Same shape and key order as the engine's `Group` (`name` mutable for the Label command), so the
 * engine can load the pool as it is; the domain cannot import the engine type.
 */
export interface DefaultGroup {
  name: string;
  ids: number[];
}

/** The ids on each truss, in rig build order, for the trusses in design order. */
function trussGroups(rig: Rig, d: StageDesign): DefaultGroup[] {
  const trussOf = new Map(d.fixtures.map((f) => [f.id, f.trussId]));
  return d.trusses
    .map((t) => ({ name: t.name, ids: rig.fixtures.filter((f) => trussOf.get(f.id) === t.id).map((f) => f.id) }))
    .filter((g) => g.ids.length > 0);
}

/**
 * The factory group pool of a stage. Slots 1-37 are the standard groups; an empty one is left out, so slot numbers
 * never shift between stages. Each truss that holds fixtures then gets a group in the next free slot from 38; trusses
 * past slot `GROUP_SLOTS` get none, as the pool grid ends there. `trussGroups: false` leaves slots 38-48 empty, so the
 * built-in Sultan's Pool stage keeps exactly the old 37-slot pool that saved shows were made with.
 */
export function defaultGroupsOf(
  rig: Rig,
  d: StageDesign,
  options: { readonly trussGroups?: boolean } = {},
): Record<number, DefaultGroup> {
  const pool: Record<number, DefaultGroup> = {};
  STANDARD_GROUPS.forEach((rule, i) => {
    const ids = selectRule(rig, d, rule);
    if (ids.length > 0) pool[i + 1] = { name: rule.name, ids };
  });
  if (options.trussGroups === false) return pool;
  const first = STANDARD_GROUPS.length + 1;
  const groups = trussGroups(rig, d).slice(0, GROUP_SLOTS - first + 1);
  for (const [i, group] of groups.entries()) pool[first + i] = group;
  return pool;
}
