import { mvrNameWords } from '../../i18n/he/mvrNameWords';
import { isEmpty, type Aabb } from '../math/Aabb';
import { nameWords } from '../scene/nameWords';
import type { LayerBox } from './layerBoxes';

/** Layer-name words that say "the venue around the stage". `floor` alone is not one: a stage floor is the deck. */
const HALL_WORDS: ReadonlySet<string> = new Set([
  ...['hall', 'venue', 'room', 'building', 'house', 'roof', 'seating', 'audience', 'floorplan'],
  ...mvrNameWords.hall,
]);

/** Slack (m) for "holds the rig": hall side walls often stand on the line of the outer trusses or wings. */
const CONTAIN_SLACK = 1;
/** A hall holds the audience area as well, so its plan is at least twice the rig's; a deck or a set is not. */
const AREA_RATIO = 2;
/** A hall reaches this far (m) past the rig on two sides or more (audience, backstage, wide side halls); a deck
 * reaches past its outer truss by a walkway or a wing of a few metres. */
const REACH = 4;
const REACH_SIDES = 2;
/** Below this plan area (m²) the rig is one fixture or a pole and gives no scale, so the box rule is off. */
const MIN_CORE_AREA = 4;

const planArea = (box: Aabb): number => (box.max[0] - box.min[0]) * (box.max[2] - box.min[2]);

function hasHallName(name: string): boolean {
  const words = nameWords(name);
  return words.some((word, i) => {
    if (word === 'house') return words[i - 1] !== 'of'; // "front of house" is the FOH position, not the hall
    return HALL_WORDS.has(word) || (word === 'floor' && words[i + 1] === 'plan');
  });
}

/** Holds the rig on plan, is at least `AREA_RATIO` times its area and reaches `REACH` past it on two sides. */
function surroundsRig(box: Aabb, core: Aabb): boolean {
  if (isEmpty(core) || planArea(core) < MIN_CORE_AREA) return false;
  const reach = ([0, 2] as const).flatMap((axis) => [core.min[axis] - box.min[axis], box.max[axis] - core.max[axis]]);
  const holds = reach.every((r) => r >= -CONTAIN_SLACK);
  const farSides = reach.filter((r) => r >= REACH).length;
  return holds && planArea(box) >= AREA_RATIO * planArea(core) && farSides >= REACH_SIDES;
}

/**
 * Whether a layer is the venue hall around the stage (walls, floor, roof, seats), which starts hidden so the stage is
 * seen; the user turns it on in the layer list. A layer that holds rig parts is never the hall (a truss "roof" system
 * is rig). Otherwise its name says so, or its box surrounds `core`, the stage core: the trusses, LED surfaces and
 * near fixtures (`stageCore`), measured without any layer test, so the order is core first, then each layer. The box
 * rule carries plots whose hall layers have plain names.
 */
export function isHallLayer(layer: Pick<LayerBox, 'name' | 'box' | 'rig'>, core: Aabb): boolean {
  if (layer.rig) return false;
  return hasHallName(layer.name) || surroundsRig(layer.box, core);
}
