import type { EngineBus } from '../events';
import type { GroupLibrary, GroupPool } from '../GroupLibrary';
import { defaultPoolOf } from './defaultPool';
import { regroup } from './regroup';
import type { RigSource } from './RigSource';

/**
 * Keeps the group pool in step with the stage (contract §2): on a rig change the untouched default groups of the old
 * stage give way to those of the new one, and the operator's own groups stay (`regroup`). It caches the defaults of
 * the current stage, because the next change must compare the pool with the defaults it was built from, and by then
 * the source already holds the new stage. A show load brings its own groups, so then only the cache moves on. It does
 * not own the pool (`GroupLibrary` does) and does not save it.
 *
 * Listens to `rigChanged`; emits `poolsChanged`, not `showChanged`, which `RigAnnouncer` already sends for kept edits.
 * Gets the `EngineBus`, the `RigSource` (the StageService) and the `GroupLibrary` from main.ts. It subscribes when it
 * is constructed, so build it right after Selection (plan §3.2 order).
 */
export class StageGroups {
  #defaults: GroupPool;

  constructor(bus: EngineBus, source: RigSource, groups: GroupLibrary) {
    this.#defaults = defaultPoolOf(source);
    bus.on('rigChanged', () => {
      const next = defaultPoolOf(source);
      if (source.cause !== 'showLoad') {
        groups.replace(regroup(groups.all, this.#defaults, next));
        bus.emit('poolsChanged', undefined);
      }
      this.#defaults = next;
    });
  }
}
