import type { Rig } from '../domain/rig';
import { defaultGroupsOf } from '../domain/stage/groupsOf';
import { BUILT_IN_DESIGN } from '../domain/stage/templates/sultansPool/builtInDesign';
import type { Group, GroupPool } from './GroupLibrary';

/**
 * The default groups that older saved shows do not have. They were appended as slots 35-37, so a show saved before
 * them may already use those slots for its own groups (quirk D5, orig:2303).
 */
export const NEW_GROUPS: readonly string[] = ['LED Bars', 'Follow Spots', 'Profiles'];

/**
 * The factory group pool of the built-in stage only; `rig` must be the rig built from it (`buildRig()`). Slot numbers
 * are part of the show format (the demo show and saved shows refer to groups by number), so groups are only ever
 * appended, never reordered. The rules are the domain's `STANDARD_GROUPS`, shared with every other stage; truss groups
 * are left out, so the pool stays the 37 slots saved shows were made with. For the current stage, any stage, use
 * `defaultPoolOf` with the StageService, as New Show and the help page do. It stays for the callers without a stage
 * service: the `ShowSerializer` and demo-show fallbacks (no `stage` deps) and the unit tests that build the built-in
 * rig alone.
 */
export function defaultGroups(rig: Rig): GroupPool {
  return defaultGroupsOf(rig, BUILT_IN_DESIGN, { trussGroups: false });
}

/**
 * Upgrades a group pool from a show saved before `NEW_GROUPS` existed: each new default group is added at its default
 * slot, but only where that slot is still empty, so the show's own groups always win. Returns a new pool.
 */
export function addNewDefaultGroups(groups: GroupPool, defaults: GroupPool): GroupPool {
  const upgraded: Record<number, Group> = { ...groups };
  for (const [slot, group] of Object.entries(defaults)) {
    if (NEW_GROUPS.includes(group.name) && !upgraded[Number(slot)]) upgraded[Number(slot)] = group;
  }
  return upgraded;
}
