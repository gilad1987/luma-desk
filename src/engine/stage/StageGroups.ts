import type { EngineBus } from '../events';
import type { GroupLibrary, GroupPool } from '../GroupLibrary';
import { defaultPoolOf } from './defaultPool';
import { regroup } from './regroup';
import type { RigSource } from './RigSource';

/**
 * The group objects `regroup` really put into the pool: where it kept the old group (the same object), that slot holds
 * a user group, so the slot's default was never installed.
 */
function installedOf(before: Readonly<GroupPool>, after: Readonly<GroupPool>, defaults: GroupPool): GroupPool {
  const installed: GroupPool = {};
  for (const slot of Object.keys(defaults).map(Number)) {
    const group = after[slot];
    if (group !== undefined && group !== before[slot]) installed[slot] = group;
  }
  return installed;
}

/**
 * Keeps the group pool in step with the stage (contract §2): on a rig change the untouched default groups of the old
 * stage give way to those of the new one, and the operator's own groups stay (`regroup`). It remembers the defaults
 * of the current stage by value, because by the next change the source already holds the new stage, and the group
 * objects it installed, because only those can be its own: a group the user stored over one, even with the same ids,
 * is a new object and stays; a label edit in place changes the value and stays. At boot and after a show load it
 * did not install the pool, so `#installed` is null and every slot equal to a default counts as one. It does not own
 * the pool (`GroupLibrary` does) and does not save it.
 *
 * Listens to `rigChanged`; emits `poolsChanged`, not `showChanged`, which `RigAnnouncer` already sends for kept edits.
 * Gets the `EngineBus`, the `RigSource` (the StageService) and the `GroupLibrary` from main.ts. It subscribes when it
 * is constructed, so build it right after Selection (plan §3.2 order).
 */
export class StageGroups {
  #defaults: GroupPool;
  #installed: GroupPool | null = null;

  constructor(bus: EngineBus, source: RigSource, groups: GroupLibrary) {
    this.#defaults = defaultPoolOf(source);
    bus.on('rigChanged', () => {
      const next = defaultPoolOf(source);
      if (source.cause === 'showLoad') {
        this.#installed = null;
      } else {
        const before = groups.all;
        const after = regroup(before, this.#ownDefaults(before), next);
        this.#installed = installedOf(before, after, next);
        groups.replace(after);
        bus.emit('poolsChanged', undefined);
      }
      this.#defaults = next;
    });
  }

  /** The defaults to compare with: all of them when this service did not install the pool, else only its own. */
  #ownDefaults(pool: Readonly<GroupPool>): GroupPool {
    const installed = this.#installed;
    if (installed === null) return this.#defaults;
    const own: GroupPool = {};
    for (const [slot, group] of Object.entries(installed)) {
      const value = this.#defaults[Number(slot)];
      if (value !== undefined && pool[Number(slot)] === group) own[Number(slot)] = value;
    }
    return own;
  }
}
