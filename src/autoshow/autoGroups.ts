import type { Rig } from '../domain/rig';
import { autoGroupsOf, type AutoSlot } from '../domain/stage/autoSlots';
import type { StageDesign } from '../domain/stage/StageDesign';
import { BUILT_IN_DESIGN } from '../domain/stage/templates/sultansPool/builtInDesign';

/**
 * The fixture id lists the auto-show lights as units, from the stage's standard group rules, plus `screen`: the LED
 * screens of the stage (none on a stage without one), so no look writes a fixed screen id.
 */
export type AutoGroups = Readonly<Record<AutoSlot | 'screen', readonly number[]>>;

/**
 * Builds the auto-show groups of `rig`, the rig built from `design` (the built-in one for a generator without a
 * stage). Each list is a separate array kept until the stage changes: the look builder tells the ring and the
 * angled-truss beams apart by array identity, not by content.
 */
export function buildAutoGroups(rig: Rig, design: StageDesign = BUILT_IN_DESIGN): AutoGroups {
  return { ...autoGroupsOf(rig, design), screen: rig.screenIds() };
}
