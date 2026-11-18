import type { Rig } from '../domain/rig';
import { autoGroupsOf, type AutoSlot } from '../domain/stage/autoSlots';
import { selectIds } from '../domain/stage/query';
import type { StageDesign } from '../domain/stage/StageDesign';
import { sultansPool } from '../domain/stage/templates/sultansPool';

/**
 * The fixture id lists the auto-show lights as units, from the stage's standard group rules, plus `screen`: the LED
 * screens of the stage (none on a stage without one), so no look writes a fixed screen id.
 */
export type AutoGroups = Readonly<Record<AutoSlot | 'screen', readonly number[]>>;

/** The built-in stage design: a generator without a stage source always works on the built-in rig. */
const BUILT_IN: StageDesign = sultansPool();

/**
 * Builds the auto-show groups of `rig`, the rig built from `design`. Each list is a separate array kept until the
 * stage changes: the look builder tells the ring and the angled-truss beams apart by array identity, not by content.
 */
export function buildAutoGroups(rig: Rig, design: StageDesign = BUILT_IN): AutoGroups {
  return { ...autoGroupsOf(rig, design), screen: selectIds(rig, design, { type: 'screen' }) };
}
