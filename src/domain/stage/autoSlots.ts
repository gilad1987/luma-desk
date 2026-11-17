import type { Rig } from '../rig/Rig';
import { selectRule } from './query';
import type { StageDesign } from './StageDesign';
import { STANDARD_GROUPS } from './standardGroups';

/** The fixture groups Auto Show builds its looks from, in the key order of the old `AG` object. */
export type AutoSlot =
  | 'audW'
  | 'towB'
  | 'towW'
  | 'ring'
  | 'rwash'
  | 'angB'
  | 'angS'
  | 'foh'
  | 't2'
  | 't3'
  | 't4'
  | 'back'
  | 'tow'
  | 'floor'
  | 'fwash'
  | 'pars'
  | 'blind'
  | 'strobe'
  | 'bars'
  | 'follow'
  | 'prof';

/**
 * The Auto Show groups of a stage, each from the rule of its standard group slot. Every key gets its own array, also
 * when it is empty: `genLook` tells groups apart by identity (`ids === AG.ring`), so two shared empty arrays would
 * look like the same group.
 */
export function autoGroupsOf(rig: Rig, d: StageDesign): Readonly<Record<AutoSlot, number[]>> {
  const slot = (n: number): number[] => {
    const rule = STANDARD_GROUPS[n - 1];
    return rule ? selectRule(rig, d, rule) : [];
  };
  return {
    audW: slot(33),
    towB: slot(31),
    towW: slot(32),
    ring: slot(24),
    rwash: slot(25),
    angB: slot(26),
    angS: slot(27),
    foh: slot(1),
    t2: slot(2),
    t3: slot(3),
    t4: slot(4),
    back: slot(5),
    tow: slot(6),
    floor: slot(7),
    fwash: slot(8),
    pars: slot(9),
    blind: slot(10),
    strobe: slot(11),
    bars: slot(35),
    follow: slot(36),
    prof: slot(37),
  };
}
