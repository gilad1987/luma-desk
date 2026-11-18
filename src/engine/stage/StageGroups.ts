import type { EngineBus } from '../events';
import type { GroupLibrary, GroupPool } from '../GroupLibrary';
import { defaultPoolOf } from './defaultPool';
import { regroup } from './regroup';
import type { RigSource } from './RigSource';

/**
 * The defaults that `regroup` really put into the pool: a slot where it kept the old group (the same object) holds a
 * user group, so that slot's default was never installed and must not be compared with on the next change.
 */
function installedOf(before: Readonly<GroupPool>, after: Readonly<GroupPool>, defaults: GroupPool): GroupPool {
  return Object.fromEntries(Object.entries(defaults).filter(([slot]) => after[Number(slot)] !== before[Number(slot)]));
}

/**
 * Keeps the group pool in step with the stage (contract §2): on a rig change the untouched default groups of the old
 * stage give way to those of the new one, and the operator's own groups stay (`regroup`). It remembers the defaults
 * it installed, as copies apart from the pool, because the next change must compare the pool with them, and by then
 * the source already holds the new stage. Only the installed ones count: a default kept out by a user group is not
 * remembered, so a user group equal to it is still the user's after any number of changes. At boot and after a show
 * load it cannot know who made a group, so then every default of the stage counts. It does not own the pool
 * (`GroupLibrary` does) and does not save it.
 *
 * Listens to `rigChanged`; emits `poolsChanged`, not `showChanged`, which `RigAnnouncer` already sends for kept edits.
 * Gets the `EngineBus`, the `RigSource` (the StageService) and the `GroupLibrary` from main.ts. It subscribes when it
 * is constructed, so build it right after Selection (plan §3.2 order).
 */
export class StageGroups {
  #installed: GroupPool;

  constructor(bus: EngineBus, source: RigSource, groups: GroupLibrary) {
    this.#installed = defaultPoolOf(source);
    bus.on('rigChanged', () => {
      const next = defaultPoolOf(source);
      if (source.cause === 'showLoad') {
        this.#installed = next;
        return;
      }
      const before = groups.all;
      const after = regroup(before, this.#installed, next);
      this.#installed = installedOf(before, after, next);
      groups.replace(after);
      bus.emit('poolsChanged', undefined);
    });
  }
}
