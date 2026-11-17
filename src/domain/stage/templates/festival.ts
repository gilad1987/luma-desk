import { STAGE_DESIGN_VERSION, type StageDesign, type StageFixture } from '../StageDesign';
import type { StageTruss } from '../trussTypes';
import type { Vec3 } from '../types';
import { placesOnTruss } from '../edit/trussPlaces';
import { sceneryFor } from '../venueScenery';
import { fixtureRow, floorLine, hangLine, span, trussLine, type RowBlock } from './layout';

const DECK_HEIGHT = 1.8;
/** The same rigged tilts as the Sultan's Pool blinders, strobes and screen pars. */
const BLINDER = { pan: 0, tilt: 64 } as const;
const STROBE = { pan: 0, tilt: 34 } as const;
const PAR = { pan: 0, tilt: -12 } as const;

const FRONT = span({ id: 'front', name: 'Front truss', role: 'front' }, [0, 11, 3], 14, 0.52);
const MID_1 = span({ id: 'mid-1', name: 'Mid truss 1', role: 'mid' }, [0, 12, -3], 14, 0.52);
const MID_2 = span({ id: 'mid-2', name: 'Mid truss 2', role: 'mid' }, [0, 12, -9], 14, 0.52);
const BACK = span({ id: 'back', name: 'Back truss', role: 'back' }, [0, 12, -14], 14, 0.52);
const RING: StageTruss = {
  id: 'ring',
  name: 'Circle truss',
  role: 'ring',
  transform: { position: [0, 9.5, -8] },
  params: { kind: 'circle', radius: 6, section: 0.5, chains: { count: 6, phase: 0 } },
};
/** Side towers just off the deck edges, left side first, front first. */
const TOWER_SPOTS = [-16.5, 16.5].flatMap((x) => [-2, -11].map((z): Vec3 => [x, 0, z]));
const TOWERS: readonly StageTruss[] = TOWER_SPOTS.map((position, i) => ({
  id: `tower-${i + 1}`,
  name: `Side tower ${i + 1}`,
  role: 'side',
  transform: { position },
  params: { kind: 'tower', a: [0, 0, 0], b: [0, 9, 0], section: 0.4 },
}));

/**
 * Fixtures spread around the circle truss by the builder's own placement, so each gets the yaw that turns its body
 * to the ring centre (G2); `phase` (in angle steps) moves a second block between the first one's fixtures.
 */
function ringRow(block: RowBlock, phase: number): StageFixture[] {
  return placesOnTruss(RING, block.count, 0, phase).map((place, i): StageFixture => ({
    id: block.first + i,
    type: block.type,
    role: 'ring',
    trussId: RING.id,
    mount: 'hang',
    ...place,
  }));
}

function festivalFixtures(): StageFixture[] {
  return [
    ...fixtureRow(hangLine(FRONT), { first: 101, count: 12, type: 'spot' }),
    ...fixtureRow(hangLine(FRONT), {
      first: 113,
      count: 8,
      type: 'blinder',
      role: 'blinder',
      fixed: BLINDER,
      lane: 0.5,
    }),
    ...fixtureRow(hangLine(FRONT), { first: 121, count: 2, type: 'follow', role: 'follow', lane: -0.5 }),
    ...fixtureRow(hangLine(MID_1), { first: 201, count: 16, type: 'beam' }),
    ...fixtureRow(hangLine(MID_1), { first: 217, count: 8, type: 'strobe', role: 'strobe', fixed: STROBE, lane: 0.5 }),
    ...fixtureRow(hangLine(MID_2), { first: 301, count: 16, type: 'wash' }),
    ...fixtureRow(hangLine(BACK), { first: 401, count: 16, type: 'beam' }),
    ...ringRow({ first: 501, count: 16, type: 'beam' }, 0),
    ...ringRow({ first: 517, count: 8, type: 'wash' }, 0.5),
    ...TOWERS.flatMap((t, i) => {
      const inward = -Math.sign(t.transform.position[0]) * 0.4;
      return fixtureRow(trussLine(t, [inward, 0, 0]), { first: 601 + i * 4, count: 4, type: 'wash' });
    }),
    ...fixtureRow(floorLine(12, DECK_HEIGHT + 0.32, -13, 'floor'), { first: 701, count: 12, type: 'beam' }),
    ...fixtureRow(floorLine(9, DECK_HEIGHT + 0.22, -15, 'floor'), { first: 801, count: 8, type: 'par', fixed: PAR }),
    ...fixtureRow(floorLine(13, DECK_HEIGHT + 0.33, -0.3, 'footlight'), { first: 901, count: 8, type: 'bar' }),
    { id: 1001, type: 'screen', role: 'screen', trussId: null, position: [0, DECK_HEIGHT + 5, -15.5], mount: 'wall' },
  ];
}

/**
 * An open-air festival stage: a 30 x 16 m deck, 1.8 m high, a 20 x 8 m LED wall, four straight trusses, a circle
 * truss, four side towers and floor rows (147 fixtures). Ids come in one block per truss (101.., 201.., ...).
 */
export function festivalStage(): StageDesign {
  return {
    v: STAGE_DESIGN_VERSION,
    source: { kind: 'template', name: 'festival' },
    venue: { kind: 'open-field', gridY: 16 },
    scenery: sceneryFor('open-field'),
    deck: { x0: -15, x1: 15, z0: -16, z1: 0, height: DECK_HEIGHT },
    screens: [{ id: 'main', fixtureId: 1001, x0: -10, x1: 10, y0: DECK_HEIGHT + 1, y1: DECK_HEIGHT + 9, z: -15.5 }],
    risers: [],
    trusses: [FRONT, MID_1, MID_2, BACK, RING, ...TOWERS],
    fixtures: festivalFixtures(),
  };
}
