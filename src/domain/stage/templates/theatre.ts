import { STAGE_DESIGN_VERSION, type StageDesign } from '../StageDesign';
import type { Vec3 } from '../types';
import { fixtureRow, floorLine, span, trussLine } from './layout';

const DECK_HEIGHT = 1;
/** Hung fixtures sit this far below the truss or pipe centre line. */
const DROP: Vec3 = [0, -0.35, 0];

const FRONT = span({ id: 'front', name: 'Front truss', role: 'front' }, [0, 6, 2], 6, 0.4);
const PIPE_1 = span({ id: 'pipe-1', name: 'Pipe 1', role: 'mid' }, [0, 6.5, -1.5], 5.5, 0.1);
const PIPE_2 = span({ id: 'pipe-2', name: 'Pipe 2', role: 'mid' }, [0, 6.5, -4], 5.5, 0.1);
const PIPE_3 = span({ id: 'pipe-3', name: 'Pipe 3', role: 'back' }, [0, 6.5, -6.5], 5.5, 0.1);

/** Four pars on the upstage deck edge, rigged at the same tilt as the Sultan's Pool screen pars. */
const FLOOR_PARS = fixtureRow(floorLine(4, DECK_HEIGHT + 0.22, -7.5, 'floor'), {
  first: 501,
  count: 4,
  type: 'par',
  fixed: { pan: 0, tilt: -12 },
});

/**
 * A small theatre: a 10 x 8 m deck, 1 m high, in a black box, with a front truss over the audience and three pipes
 * over the deck (30 fixtures). Ids come in one block per truss (101.., 201.., ...), the floor last.
 */
export function theatreStage(): StageDesign {
  return {
    v: STAGE_DESIGN_VERSION,
    source: { kind: 'template', name: 'theatre' },
    venue: { kind: 'black-box', gridY: 8 },
    scenery: { deck: true, trusses: true, band: true, ledWall: false, crowd: true },
    deck: { x0: -5, x1: 5, z0: -8, z1: 0, height: DECK_HEIGHT },
    screens: [],
    risers: [],
    trusses: [FRONT, PIPE_1, PIPE_2, PIPE_3],
    fixtures: [
      ...fixtureRow(trussLine(FRONT, DROP), { first: 101, count: 6, type: 'spot' }),
      ...fixtureRow(trussLine(FRONT, DROP), {
        first: 107,
        count: 2,
        type: 'blinder',
        role: 'blinder',
        fixed: { pan: 0, tilt: 64 },
        lane: 0.4,
      }),
      ...fixtureRow(trussLine(PIPE_1, DROP), { first: 201, count: 6, type: 'wash' }),
      ...fixtureRow(trussLine(PIPE_2, DROP), { first: 301, count: 4, type: 'spot' }),
      ...fixtureRow(trussLine(PIPE_2, DROP), {
        first: 305,
        count: 2,
        type: 'strobe',
        role: 'strobe',
        fixed: { pan: 0, tilt: 34 },
        lane: 0.4,
      }),
      ...fixtureRow(trussLine(PIPE_3, DROP), { first: 401, count: 6, type: 'beam' }),
      ...FLOOR_PARS,
    ],
  };
}
