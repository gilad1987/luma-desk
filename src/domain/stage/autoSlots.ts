import type { FixtureTypeId } from '../FixtureType';
import type { Rig } from '../rig/Rig';
import { selectIds, selectRule } from './query';
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

/** Where a light that no legacy rule finds goes, by type; a tower beam or wash goes to `towB` or `towW` instead. */
const OTHER_LIGHTS: Readonly<Record<Exclude<FixtureTypeId, 'screen' | 'device'>, AutoSlot>> = {
  spot: 't4',
  beam: 't2',
  wash: 't3',
  par: 'pars',
  blinder: 'blind',
  strobe: 'strobe',
  bar: 'bars',
  follow: 'follow',
  profile: 'prof',
};

/**
 * Appends each light no group holds to the group of its type, after the legacy ids: Auto Show sets every light dark
 * first, so a builder or MVR light outside the legacy rules (a beam on a front truss) would stay dark in every look.
 * Every built-in light is in a legacy rule, so the built-in groups do not change. Screens and devices are no lights.
 */
function addOtherLights(rig: Rig, d: StageDesign, groups: Readonly<Record<AutoSlot, number[]>>): void {
  const placed = new Set(Object.values(groups).flat());
  const onTower = new Set(selectIds(rig, d, { truss: 'tower' }));
  for (const f of rig.fixtures) {
    if (f.type === 'screen' || f.type === 'device' || placed.has(f.id)) continue;
    let slot = OTHER_LIGHTS[f.type];
    if (onTower.has(f.id) && f.type === 'beam') slot = 'towB';
    if (onTower.has(f.id) && f.type === 'wash') slot = 'towW';
    groups[slot].push(f.id);
  }
}

/**
 * The Auto Show groups of a stage: the rule of each group's standard slot, then the lights no rule finds. Every key
 * gets its own array, also when it is empty: `genLook` tells groups apart by identity (`ids === AG.ring`), so two
 * shared empty arrays would look like the same group. Slot numbers are static, so a missing slot is a code bug.
 *
 * @throws RangeError when a slot number names no standard group: a code bug, so it fails loudly at once rather than
 * giving Auto Show an empty group that looks valid.
 */
export function autoGroupsOf(rig: Rig, d: StageDesign): Readonly<Record<AutoSlot, number[]>> {
  const slot = (n: number): number[] => {
    const rule = STANDARD_GROUPS[n - 1];
    if (!rule) throw new RangeError(`autoGroupsOf: no standard group in slot ${n}`);
    return selectRule(rig, d, rule);
  };
  const groups = {
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
  addOtherLights(rig, d, groups);
  return groups;
}
