import type { StageBounds } from '../../domain/stage/types';
import type { ViewTable } from '../camera/viewTable';
import { DEFAULT_FOV } from './lens';
import type { StagePlace } from './StagePlace';

export type { StagePlace } from './StagePlace';

/** The views that stand on or next to the performance area and are the same in every frame. */
export type StageViewTable = Pick<ViewTable, 'stage' | 'band' | 'aud'>;

/** Eye height of a standing person (m). */
const EYE = 1.7;
/** A wider lens for the views that look out from the stage. */
const WIDE_FOV = 60;
/** The audience view stands this high over the deck (m): above the heads of the band, below a flown truss. */
const AUD_RISE = 4;
/** The house is taken to be at least this deep (m) when the file draws no seats. */
const MIN_HOUSE = 30;
/** The On Stage eye stands this far in front of a backdrop (m): an arm's length and a step. */
export const BACKDROP_CLEAR = 1.5;
/** The lens of the On Stage view (degrees): a person's wide look, which holds the house and the rig overhead. */
const STAGE_FOV = 65;

/** The performance floor: its centre line, its upstage and downstage edges (world z), its width and its top. */
export interface Floor {
  readonly x: number;
  readonly upstage: number;
  readonly downstage: number;
  readonly width: number;
  readonly top: number;
}

/**
 * The performance floor: the design's deck when it lies in the stage box. A file without a usable deck gives the
 * middle half of the box width at the box floor, where a band stands on most stages.
 */
export function floorOf({ stage: { min, max }, deck }: StagePlace): Floor {
  const x = deck ? (deck.x0 + deck.x1) / 2 : NaN;
  const z = deck ? (deck.z0 + deck.z1) / 2 : NaN;
  if (deck && deck.x1 > deck.x0 && deck.z1 > deck.z0 && x >= min[0] && x <= max[0] && z >= min[2] && z <= max[2])
    return { x, upstage: deck.z0, downstage: deck.z1, width: deck.x1 - deck.x0, top: deck.height };
  return { x: (min[0] + max[0]) / 2, upstage: min[2], downstage: max[2], width: (max[0] - min[0]) / 2, top: min[1] };
}

/** Where a performer stands upstage centre (world z): a quarter of the floor depth in from the back edge. */
export const upstageCentre = (floor: Floor): number => floor.upstage + (floor.downstage - floor.upstage) / 4;

/**
 * The views on and next to the performance floor of an imported stage. The scaled built-in positions (`fitViews`)
 * are places of the demo venue: with the seats in the camera box they land in the house or inside the set. These are
 * placed from the deck instead. The orbit controls lift an eye that is below its target, so no eye is. The buttons
 * mean what they mean on the built-in stage (`VIEWS`): On Stage looks out to the house, Crowd (`crowdView`) looks at
 * the stage from the house.
 * - `stage`: a performer at upstage centre (`upstageCentre`), at least `BACKDROP_CLEAR` in front of what blocks the
 *   view there (`place.backdrop`), looking level over the band into the house: a look down would lose the rig.
 * - `band`: from in front of the downstage edge, a little off centre, on the middle of the deck at chest height.
 * - `aud`: from above the middle of the deck down on the seats (the far end of the camera box).
 */
export function stageViews(place: StagePlace, box: StageBounds): StageViewTable {
  const floor = floorOf(place);
  const { x, upstage, downstage, width, top } = floor;
  const middle = (upstage + downstage) / 2;
  const houseEnd = Math.max(box.max[2], downstage + MIN_HOUSE);
  const chest = top + 1.4;
  const backdrop = place.backdrop ?? -Infinity;
  return {
    stage: {
      position: [x, top + EYE, Math.max(upstageCentre(floor), backdrop + BACKDROP_CLEAR)],
      target: [x, top + EYE, downstage + 0.4 * (houseEnd - downstage)],
      fov: STAGE_FOV,
    },
    band: {
      position: [x + 0.12 * width, top + 2.4, downstage + 0.45 * width],
      target: [x, chest, middle],
      fov: DEFAULT_FOV,
    },
    aud: {
      position: [x, top + AUD_RISE, middle],
      target: [(box.min[0] + box.max[0]) / 2, box.min[1] + 1, downstage + 0.6 * (houseEnd - downstage)],
      fov: WIDE_FOV,
    },
  };
}
