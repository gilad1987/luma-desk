import { STAGE_DESIGN_VERSION, type StageDesign } from '../../../../src/domain/stage/StageDesign.ts';
import { parseStageDesign } from '../../../../src/domain/stage/parse/parseStageDesign.ts';

/**
 * A valid design that uses every optional field and every truss kind, so the parse tests can change one field at a
 * time and see exactly one rule fire. Its rotations are exact unit quaternions, so normalizing them changes nothing.
 */
export const SAMPLE: StageDesign = {
  v: STAGE_DESIGN_VERSION,
  source: { kind: 'mvr', name: 'Sample', fileHash: 'abc123' },
  venue: { kind: 'black-box', gridY: 9.5 },
  scenery: { deck: true, trusses: true, band: false, ledWall: true, crowd: false },
  deck: { x0: -8, x1: 8, z0: -5, z1: 3, height: 1.2 },
  screens: [
    {
      id: 'wall',
      fixtureId: 9,
      x0: -4,
      x1: 4,
      y0: 2,
      y1: 6,
      z: -4.5,
      sides: [{ at: [-7, 4, -4], yaw: 0.3, width: 3, height: 2 }],
    },
  ],
  risers: [{ id: 'drum', at: [0, 1.6, -3], size: [3, 0.4, 2] }],
  trusses: [
    {
      id: 'front',
      name: 'Front',
      role: 'front',
      transform: { position: [0, 7, 2] },
      params: {
        kind: 'straight',
        a: [-6, 0, 0],
        b: [6, 0, 0],
        section: 0.4,
        chains: [[-5, 0, 0]],
        parts: [{ size: [0.6, 0.1, 0.6], at: [0, 0, 0], material: 'dark' }],
      },
    },
    {
      id: 'ring',
      name: 'Ring',
      role: 'ring',
      transform: { position: [0, 8, 0], rotation: [0, 1, 0, 0] },
      params: { kind: 'circle', radius: 4, section: 0.3, chains: { count: 4, phase: 0.5 } },
    },
    {
      id: 'gp',
      name: 'Goal',
      role: 'back',
      transform: { position: [0, 0, -4] },
      params: { kind: 'goalpost', width: 10, height: 6, section: 0.4 },
    },
    {
      id: 'tw',
      name: 'Tower',
      role: 'side',
      transform: { position: [7, 0, 0] },
      params: { kind: 'tower', a: [0, 0, 0], b: [0, 6, 0], section: 0.3 },
    },
    {
      id: 'roof',
      name: 'Roof',
      role: 'back',
      transform: { position: [0, 10, 0] },
      params: { kind: 'roof', size: [16, 1, 10] },
    },
  ],
  fixtures: [
    { id: 1, type: 'spot', role: 'front', trussId: 'front', position: [-5, 6.8, 2], mount: 'hang' },
    { id: 2, type: 'wash', role: 'ring', trussId: 'ring', position: [4, 8, 0], mount: 'hang', rotation: [0, 0, 1, 0] },
    {
      id: 3,
      type: 'par',
      role: 'floor',
      trussId: null,
      position: [0, 1.2, 2],
      mount: 'floor',
      fixed: { pan: 0, tilt: 30 },
    },
    {
      id: 4,
      type: 'bar',
      role: 'footlight',
      trussId: null,
      position: [1, 1.2, 2.5],
      mount: 'floor',
      pixel: { p: [1, 1.2, 2.5], tan: [1, 0, 0], len: 1 },
    },
    { id: 9, type: 'screen', role: 'screen', trussId: null, position: [0, 4, -4.5], mount: 'wall' },
  ],
};

/** The errors for `raw`, or none when it parses, so a rejection test can match the exact message. */
export function errorsOf(raw: unknown): readonly string[] {
  const result = parseStageDesign(raw);
  return result.ok ? [] : result.errors;
}
