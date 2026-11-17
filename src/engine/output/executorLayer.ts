import type { Fixture } from '../../domain/Fixture';
import type { Executor } from '../Executor';
import { attrEntries, fxKey } from '../shared';
import { emptySlots, PHASER_FEATURES, type PhaserSlots } from './PhaserSlots';
import type { AttrOutput } from './resetOutput';

/**
 * Merges the active executors into `o` for fixture `f`, oldest GO first: the dimmer is HTP and scaled by the level,
 * every other attribute is LTP and ignores the level. A flash counts as full level. The auto-show pump scales the auto
 * executor on beams and spots only. Returns the phaser each feature would run, with the level of its executor.
 */
export function mergeExecutors(f: Fixture, o: AttrOutput, active: readonly Executor[], pump: number): PhaserSlots {
  const slots = emptySlots();
  for (const e of active) {
    const lv = (e.flash ? 1 : e.level) * (e.auto && (f.type === 'beam' || f.type === 'spot') ? pump : 1),
      v = e.vals[f.id];
    if (v)
      for (const [a, value] of attrEntries(v)) {
        if (a === 'dim') o.dim = Math.max(o.dim, value * lv);
        else o[a] = value;
      }
    for (const ft of PHASER_FEATURES) {
      const r = e.fx[fxKey(f.id, ft)];
      if (r) slots[ft] = { r, lv };
    }
  }
  return slots;
}
