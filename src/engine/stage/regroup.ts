import type { Group, GroupPool } from '../GroupLibrary';

/** The default pool of a stage, by slot; `defaultGroupsOf` returns this shape. */
export type DefaultPool = Readonly<Record<number, Readonly<Group>>>;

function sameGroup(a: Readonly<Group>, b: Readonly<Group>): boolean {
  return a.name === b.name && a.ids.length === b.ids.length && a.ids.every((id, i) => id === b.ids[i]);
}

/**
 * The group pool after a rig change. A slot that still holds exactly the old default of that slot was never touched
 * by the operator, so it is dropped; any other group is the operator's and stays, as the same object. Each new default
 * then fills its own slot if that slot is free; a default never moves to another slot, so slot numbers stay stable.
 * New defaults are copied, so a later Label on the pool cannot change the defaults the next change compares with.
 */
export function regroup(pool: Readonly<GroupPool>, oldDefaults: DefaultPool, newDefaults: DefaultPool): GroupPool {
  const next: GroupPool = {};
  for (const [slot, group] of Object.entries(pool)) {
    const oldDefault = oldDefaults[Number(slot)];
    if (oldDefault === undefined || !sameGroup(group, oldDefault)) next[Number(slot)] = group;
  }
  for (const [slot, group] of Object.entries(newDefaults)) {
    if (next[Number(slot)] === undefined) next[Number(slot)] = { name: group.name, ids: [...group.ids] };
  }
  return next;
}
