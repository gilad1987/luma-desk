import { describe, expect, it } from 'vitest';
import { STAGE } from '../../../src/domain/venue.ts';
import type { ResolvedFixture } from '../../../src/mvr/design/DesignInput.ts';
import { toStageDesign } from '../../../src/mvr/design/toStageDesign.ts';
import { makeFixtureRecord, makeScene, mvrMatrix } from '../../shared/index.ts';

/** A 10 m x 10 m x 1 m deck mesh, centred on the MVR origin. */
const DECK_MESH = new Map([['deck.3ds', { min: [-5000, -5000, 0], max: [5000, 5000, 1000] } as const]]);
const PLACEMENT = { file: 'deck.3ds', matrix: mvrMatrix(undefined), layer: 'l1', kind: 'SceneObject', uuid: 'd' };
const UPSIDE_DOWN = '{1,0,0}{0,-1,0}{0,0,-1}';

const fixture = (uuid: string, matrix: string, extra: Partial<ResolvedFixture> = {}): ResolvedFixture => ({
  record: makeFixtureRecord({ uuid, matrix, layer: 'l1', ...(uuid === 'a' ? { focus: 'f1' } : {}) }),
  type: 'spot',
  gdtfName: `Type ${uuid}`,
  mode: 'Std',
  ...extra,
});

const FIXTURES = [
  fixture('a', '{1,0,0}{0,1,0}{0,0,1}{0,4000,6000}', { patch: { universe: 2, address: 1 } }),
  fixture('b', '{1,0,0}{0,1,0}{0,0,1}{0,-4000,6000}'),
  fixture('c', `${UPSIDE_DOWN}{2000,0,1000}`),
];

const scene = makeScene({
  layers: [{ uuid: 'l1', name: 'Rig' }],
  placements: [PLACEMENT],
  focusPoints: new Map([['f1', mvrMatrix('{1,0,0}{0,1,0}{0,0,1}{0,0,0}')]]),
});

const CENTRE_Z = (STAGE.z0 + STAGE.z1) / 2;
const result = toStageDesign({ name: 'Show.mvr', fileHash: 'abc', scene, fixtures: FIXTURES, meshBoxes: DECK_MESH });
const { design } = result;

describe('toStageDesign design', () => {
  it('marks the source as MVR, stands it in a black box and turns all scenery off', () => {
    expect(design.source).toEqual({ kind: 'mvr', name: 'Show.mvr', fileHash: 'abc' });
    expect(design.venue).toEqual({ kind: 'black-box' });
    expect(Object.values(design.scenery)).toEqual([false, false, false, false, false]);
    expect([design.screens, design.risers, design.trusses]).toEqual([[], [], []]);
  });

  it('fits the file on the stage and takes the deck from the deck mesh', () => {
    expect(result.geometry.offset.map((v) => v + 0)).toEqual([0, 0, CENTRE_Z]);
    expect(design.deck).toEqual({ x0: -5, x1: 5, z0: CENTRE_Z - 5, z1: CENTRE_Z + 5, height: 1 });
    expect(design.fixtures.map((f) => f.position)).toEqual([
      [0, 6, CENTRE_Z - 4],
      [0, 6, CENTRE_Z + 4],
      [2, 1, CENTRE_Z],
    ]);
    expect(result.warnings).toEqual([]);
  });

  it('sets mount, role, rotation and an empty truss link per fixture', () => {
    expect(design.fixtures.map((f) => [f.id, f.mount, f.role, f.trussId])).toEqual([
      [1, 'hang', 'back', null],
      [2, 'hang', 'front', null],
      [3, 'floor', 'floor', null],
    ]);
    expect(design.fixtures[0]?.rotation, 'a hung body at rest has no rotation').toBeUndefined();
  });
});

describe('toStageDesign fixture data and geometry', () => {
  it('maps the patch with its mode and leaves unpatched fixtures without one', () => {
    expect(design.fixtures[0]?.patch).toEqual({ universe: 2, address: 1, mode: 'Std' });
    expect(design.fixtures[1]).not.toHaveProperty('patch');
  });

  it('keeps the MVR facts by desk id', () => {
    expect(design.mvr?.fixtures['1']).toEqual({
      uuid: 'a',
      layer: 'l1',
      gdtfName: 'Type a',
      gdtfMode: 'Std',
      type: 'spot',
      focus: [0, 0, CENTRE_Z],
    });
    expect(design.mvr?.fixtures['2']).not.toHaveProperty('focus');
    expect(design.mvr?.layers).toEqual([{ uuid: 'l1', name: 'Rig' }]);
    expect(design.mvr?.hiddenLayers).toEqual([]);
  });

  it('gives geometry with MVR placements, top surfaces and bounds', () => {
    expect(result.geometry.placements).toEqual([PLACEMENT]);
    expect(result.geometry.surfaces.map((s) => s.face)).toEqual(['top']);
    expect(result.geometry.bounds).toEqual({ min: [-5, 0, CENTRE_Z - 5], max: [5, 6, CENTRE_Z + 5] });
  });

  it('still places fixtures without any readable mesh, on a ground deck, with a `no-geometry` warning', () => {
    const bare = toStageDesign({ name: 'Bare', scene, fixtures: FIXTURES, meshBoxes: new Map() });
    expect(bare.warnings.map((w) => w.code)).toEqual(['no-geometry']);
    expect(bare.design.source).toEqual({ kind: 'mvr', name: 'Bare' });
    expect(bare.design.deck).toEqual({ ...STAGE, height: 0 });
    expect(bare.design.fixtures.map((f) => f.position[1])).toEqual([6, 6, 1]);
  });
});
