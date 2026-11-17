import { STAGE_DESIGN_VERSION, type StageDesign } from '../../../../../src/domain/stage/StageDesign.ts';
import type { StageTruss } from '../../../../../src/domain/stage/trussTypes.ts';

/** A 10 m pipe on the centre line, 7 m up. */
export const PIPE: StageTruss = {
  id: 'pipe-1',
  name: 'Pipe 1',
  role: 'mid',
  transform: { position: [0, 7, 0] },
  params: { kind: 'straight', a: [-5, 0, 0], b: [5, 0, 0], section: 0.3 },
};

/** A 4 m tower on house left (left as seen from the audience, x < 0). */
export const LEFT_TOWER: StageTruss = {
  id: 'left-1',
  name: 'Left tower',
  role: 'side',
  transform: { position: [-4, 1, -2] },
  params: { kind: 'tower', a: [0, 0, 0], b: [0, 4, 0], section: 0.3 },
};

/**
 * A small hand-written design for the edit-op tests: the pipe with two washes, the house-left tower with one rotated
 * beam, and one floor par. It is a literal on purpose, so the edit tests do not depend on the templates.
 */
export function sampleDesign(): StageDesign {
  return {
    v: STAGE_DESIGN_VERSION,
    source: { kind: 'builder', name: 'edit-test' },
    venue: { kind: 'black-box', gridY: 9 },
    scenery: { deck: true, trusses: true, band: true, ledWall: true, crowd: false },
    deck: { x0: -6, x1: 6, z0: -4, z1: 4, height: 1 },
    screens: [],
    risers: [],
    trusses: [PIPE, LEFT_TOWER],
    fixtures: [
      { id: 101, type: 'wash', role: 'mid', trussId: 'pipe-1', position: [-2, 7, 0], mount: 'hang' },
      { id: 102, type: 'wash', role: 'mid', trussId: 'pipe-1', position: [2, 7, 0], mount: 'hang' },
      {
        id: 201,
        type: 'beam',
        role: 'side',
        trussId: 'left-1',
        position: [-4, 3, -2],
        mount: 'hang',
        rotation: [0, 0.6, 0, 0.8],
      },
      { id: 301, type: 'par', role: 'floor', trussId: null, position: [-3, 1, 3], mount: 'floor' },
    ],
  };
}

/** Numbers rounded to 1e-9 with -0 made +0, so float results compare with `toEqual`. */
export function rounded(values: readonly number[]): number[] {
  return values.map((v) => Math.round(v * 1e9) / 1e9 + 0);
}
