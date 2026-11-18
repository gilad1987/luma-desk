/**
 * Owns the shared stage model types of src/domain/stage: the order of the const lists that UI toggles and role-based
 * groups iterate, and the readonly/optional shape that the MVR lane builds against. It catches a reordered or dropped
 * list entry and a field that loses `readonly` or becomes required. Parsing and rig derivation are tested elsewhere.
 */
import { describe, expect, expectTypeOf, it } from 'vitest';
import {
  STAGE_DESIGN_VERSION,
  type StageDeck,
  type StageDesign,
  type StageFixture,
} from '../../../../src/domain/stage/StageDesign.ts';
import {
  FIXTURE_ROLES,
  SCENERY_PARTS,
  type Quat,
  type SceneryPart,
  type Vec3,
} from '../../../../src/domain/stage/types.ts';

const sample: StageDesign = {
  v: STAGE_DESIGN_VERSION,
  source: { kind: 'builder', name: 'sample' },
  venue: { kind: 'black-box', gridY: 9 },
  scenery: { deck: true, trusses: true, band: false, ledWall: false, crowd: true },
  deck: { x0: -6, x1: 6, z0: -4, z1: 4, height: 1.2 },
  screens: [],
  risers: [],
  trusses: [
    {
      id: 't1',
      name: 'Front',
      role: 'front',
      transform: { position: [0, 8, 4] },
      params: { kind: 'straight', a: [-5, 0, 0], b: [5, 0, 0], section: 0.4 },
    },
    {
      id: 'r1',
      name: 'Ring',
      role: 'ring',
      transform: { position: [0, 9, 0], rotation: [0, 0, 0, 1] },
      params: { kind: 'circle', radius: 4, section: 0.4, chains: { count: 4, phase: 0 } },
    },
  ],
  fixtures: [
    { id: 101, type: 'spot', role: 'front', trussId: 't1', position: [-2, 8, 4], mount: 'hang' },
    {
      id: 201,
      type: 'beam',
      role: 'ring',
      trussId: 'r1',
      position: [4, 9, 0],
      mount: 'hang',
      rotation: [0, 0.7071, 0, 0.7071],
    },
  ],
};

describe('stage types', () => {
  it('lists the five scenery parts in UI order', () => {
    expect(SCENERY_PARTS).toEqual(['deck', 'trusses', 'band', 'ledWall', 'crowd']);
  });

  it('lists the fourteen fixture roles in plan order', () => {
    expect(FIXTURE_ROLES).toEqual([
      'front',
      'mid',
      'back',
      'ring',
      'angled',
      'side',
      'floor',
      'footlight',
      'blinder',
      'strobe',
      'screen',
      'follow',
      'profile',
      'hazer',
    ]);
  });

  it('accepts a sample design and types it readonly down to the scenery and the deck', () => {
    expectTypeOf(sample).pick<'fixtures'>().toEqualTypeOf<{ readonly fixtures: readonly StageFixture[] }>();
    expectTypeOf<Pick<StageDesign, 'scenery'>>().toEqualTypeOf<{
      readonly scenery: Readonly<Record<SceneryPart, boolean>>;
    }>();
    expectTypeOf<Pick<StageDeck, 'height'>>().toEqualTypeOf<{ readonly height: number }>();
  });

  it('makes rotation optional and position a Vec3', () => {
    expectTypeOf<StageFixture['position']>().toEqualTypeOf<Vec3>();
    expectTypeOf<StageFixture['rotation']>().toEqualTypeOf<Quat | undefined>();
    expectTypeOf<Pick<StageFixture, 'id' | 'rotation'>>().toEqualTypeOf<{
      readonly id: number;
      readonly rotation?: Quat;
    }>();
  });
});
