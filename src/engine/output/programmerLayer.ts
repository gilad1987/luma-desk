import { ATTR } from '../../domain/attributes';
import type { Fixture } from '../../domain/Fixture';
import type { FixtureValues } from '../CueList';
import { attrEntries, fxKey, type FxIndex } from '../shared';
import { PHASER_FEATURES, type PhaserSlots } from './PhaserSlots';
import type { AttrOutput } from './resetOutput';

/**
 * What the output merge reads from the programmer. The programmer replaces both objects when it is cleared, so the
 * merge reads them through this view on every frame instead of keeping a reference.
 */
export interface ProgrammerOutput {
  readonly vals: Readonly<FixtureValues>;
  readonly fx: Readonly<FxIndex>;
}

/**
 * Lays the programmer over the executors for fixture `f`: its values win, and a value also stops the executor phaser
 * on the same feature. Its own phasers then win at full level.
 */
export function mergeProgrammer(f: Fixture, o: AttrOutput, slots: PhaserSlots, programmer: ProgrammerOutput): void {
  const pv = programmer.vals[f.id];
  if (pv)
    for (const [a, value] of attrEntries(pv)) {
      o[a] = value;
      slots[ATTR[a].feat] = null;
    }
  for (const ft of PHASER_FEATURES) {
    const r = programmer.fx[fxKey(f.id, ft)];
    if (r) slots[ft] = { r, lv: 1 };
  }
}
