import { mvrNameWords } from '../../i18n/he/mvrNameWords';
import { isEmpty, type Aabb } from '../math/Aabb';
import { nameWords } from '../scene/nameWords';
import type { LayerBox } from './layerBoxes';

/** Layer-name words that say "the venue around the stage". `floor` alone is not one: a stage floor is the deck. */
const HALL_WORDS: ReadonlySet<string> = new Set([
  ...['hall', 'venue', 'room', 'building', 'house', 'roof', 'seating', 'audience', 'floorplan'],
  ...mvrNameWords.hall,
]);

/**
 * Layer-name words for a part of a building that a stage has too (a stage floor, a set wall), so they count only for a
 * layer that also reaches far past the rig (`STRUCTURE_REACH`).
 */
const STRUCTURE_WORDS: ReadonlySet<string> = new Set(['wall', 'walls', 'floor', 'ceiling', ...mvrNameWords.structure]);

/** Slack (m) for "holds the rig": hall side walls often stand on the line of the outer trusses or wings. */
const CONTAIN_SLACK = 1;
/** A hall holds the audience area as well, so its plan is at least twice the rig's; a deck or a set is not. */
const AREA_RATIO = 2;
/** A hall reaches this far (m) past the rig on two sides or more (audience, backstage, wide side halls); a deck
 * reaches past its outer truss by a walkway or a wing of a few metres. */
const REACH = 4;
const REACH_SIDES = 2;
/** A hall floor or wall reaches this far (m) past the rig on one side at least (the audience floor, the side walls of
 * a wide hall); a stage floor or a set wall stays within a walkway of the rig. */
const STRUCTURE_REACH = 4;
/** Below this plan area (m²) the rig is one fixture or a pole and gives no scale, so the box rules are off. */
const MIN_CORE_AREA = 4;

const planArea = (box: Aabb): number => (box.max[0] - box.min[0]) * (box.max[2] - box.min[2]);

function hasHallName(name: string): boolean {
  const words = nameWords(name);
  return words.some((word, i) => {
    if (word === 'house') return words[i - 1] !== 'of'; // "front of house" is the FOH position, not the hall
    return HALL_WORDS.has(word) || (word === 'floor' && words[i + 1] === 'plan');
  });
}

const hasStructureName = (name: string): boolean => nameWords(name).some((word) => STRUCTURE_WORDS.has(word));

/** How far (m) the box reaches past the core on plan, on its four sides (-x, +x, -z, +z); negative is inside. */
function planReach(box: Aabb, core: Aabb): number[] {
  return ([0, 2] as const).flatMap((axis) => [core.min[axis] - box.min[axis], box.max[axis] - core.max[axis]]);
}

const givesScale = (core: Aabb): boolean => !isEmpty(core) && planArea(core) >= MIN_CORE_AREA;

/** A hall's walls rise around the hung rig; a deck with its set, risers and audience platforms stays below its middle. */
const rises = (box: Aabb, core: Aabb): boolean => box.max[1] >= (core.min[1] + core.max[1]) / 2;

/**
 * Holds the rig on plan, is at least `AREA_RATIO` times its area, reaches `REACH` past it on two sides and rises to
 * the rig's mid-height.
 */
function surroundsRig(box: Aabb, core: Aabb): boolean {
  if (!givesScale(core) || !rises(box, core)) return false;
  const reach = planReach(box, core);
  const holds = reach.every((r) => r >= -CONTAIN_SLACK);
  const farSides = reach.filter((r) => r >= REACH).length;
  return holds && planArea(box) >= AREA_RATIO * planArea(core) && farSides >= REACH_SIDES;
}

/** A layer named as a wall, floor or ceiling that reaches `STRUCTURE_REACH` past the rig on one side or more. */
function isHallStructure(layer: Pick<LayerBox, 'name' | 'box'>, core: Aabb): boolean {
  if (!givesScale(core) || !hasStructureName(layer.name)) return false;
  return planReach(layer.box, core).some((r) => r >= STRUCTURE_REACH);
}

/**
 * Whether a layer is the venue hall around the stage (walls, floor, roof, seats), which starts hidden so the stage is
 * seen; the user turns it on in the layer list. A layer that holds rig parts is never the hall (a truss "roof" system
 * is rig). Otherwise its name says so, or it is named as a wall, floor or ceiling and reaches far past the rig, or its
 * box surrounds `core`, the stage core: the trusses, LED surfaces and near fixtures (`stageCore`), measured without
 * any layer test, so the order is core first, then each layer. The box rules carry plots whose hall layers have plain
 * names; a hall floor or wall often misses part of the rig or is too slim for the surround rule.
 */
export function isHallLayer(layer: Pick<LayerBox, 'name' | 'box' | 'rig'>, core: Aabb): boolean {
  if (layer.rig) return false;
  return hasHallName(layer.name) || isHallStructure(layer, core) || surroundsRig(layer.box, core);
}
