/** An imported design, without its original bytes, that holds every piece of `<Fixture>` file data. Names invented. */
import type { MvrDesignInfo } from '../../../../src/domain/stage/mvr.ts';
import type { StageDesign } from '../../../../src/domain/stage/StageDesign.ts';
import { createTemplate } from '../../../../src/domain/stage/templates/index.ts';

const LAYER = { uuid: '0E9B1C2A-1111-4222-8333-444455556666', name: 'Rig' };
export const CLASS = 'C0000000-0000-4000-8000-000000000001';
export const POSITION = 'D0000000-0000-4000-8000-000000000002';
const info = { layer: LAYER.uuid, gdtfName: 'Test@Spot.gdtf', gdtfMode: 'Mode 1', type: 'spot' } as const;
export const EVERY = { color: 0, commands: 0, position: 0, classing: 0, fixtureFunction: 'Key <light>' } as const;
export const FLAGS = { dmxInvertPan: true, dmxInvertTilt: true, castShadow: false, customIdType: 2 } as const;

/**
 * Fixture 1 holds every field; 2 has dangling references; 3 has commands and, in the design, another type. 4 and 5
 * have the commands of 1 (pan 45, tilt -30: the desk aim 45, 30) and a rest aim on the desk: 4 the aim of the file
 * within 0.01 degree, 5 another one.
 */
export const HELD: MvrDesignInfo = {
  fixtures: {
    '1': { ...info, ...EVERY, ...FLAGS, customId: 5, uuid: 'A0000000-0000-4000-8000-000000000001' },
    '2': { ...info, uuid: 'A0000000-0000-4000-8000-000000000002', classing: 1, position: 1, castShadow: true },
    '3': { ...info, uuid: 'A0000000-0000-4000-8000-000000000003', commands: 0, color: 1 },
    '4': { ...info, uuid: 'A0000000-0000-4000-8000-000000000004', commands: 0 },
    '5': { ...info, uuid: 'A0000000-0000-4000-8000-000000000005', commands: 0 },
  },
  colors: [
    { xyY: [0.2, 0.3, 40], rgb: [0, 1, 0.5] },
    { xyY: [0.4512, 0.4, 87.5], rgb: [1, 0.8, 0.2] },
  ],
  commandSets: [['Body_Pan,f 45', 'Yoke_Tilt,f -30', '/1/Body_Zoom/percent ,f 20']],
  positions: [{ uuid: POSITION, name: 'Front truss' }, { uuid: 'nope' }],
  classes: [{ uuid: CLASS, name: 'Lighting & more' }, { uuid: 'E0000000-0000-4000-8000-000000000009' }],
  layers: [LAYER],
  hiddenLayers: [],
  offset: [0, 0, 0],
};

export function heldDesign(): StageDesign {
  const spot = { type: 'spot', role: 'front', trussId: null, position: [1, 6, 2], mount: 'hang' } as const;
  const patch = (address: number) => ({ universe: 1, address, mode: '' });
  const fixtures = [
    { ...spot, id: 1, patch: patch(1) },
    { ...spot, id: 2, patch: patch(101) },
    { ...spot, id: 3, type: 'wash' as const, patch: patch(201) },
    { ...spot, id: 4, patch: patch(301), fixed: { pan: 45.01, tilt: 29.99 } },
    { ...spot, id: 5, patch: patch(401), fixed: { pan: 45, tilt: 30.02 } },
  ];
  return { ...createTemplate('theatre'), source: { kind: 'mvr', name: 'show.mvr' }, fixtures, mvr: HELD };
}
