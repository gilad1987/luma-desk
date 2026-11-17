import type { Feature } from '../../domain/attributes';
import { PHASER_TYPES, type PhaserInstance } from './phaserTypes';

/**
 * Removes `ids` from every instance in `list`, or only from instances that drive `feat` when it is given. It leaves
 * emptied instances in the list: some callers return before they compact, and that stale state is observable, so
 * compaction is the separate step {@link compactFx}.
 */
export function stripFx(list: readonly PhaserInstance[], ids: readonly number[], feat?: Feature): void {
  for (const inst of list) {
    if (feat === undefined || PHASER_TYPES[inst.type].feat === feat)
      inst.ids = inst.ids.filter((id) => !ids.includes(id));
  }
}

/** A new list without the instances that no longer drive any fixture. */
export function compactFx(list: readonly PhaserInstance[]): PhaserInstance[] {
  return list.filter((inst) => inst.ids.length > 0);
}
